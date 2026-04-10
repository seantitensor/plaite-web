# Web Admin Dashboard — Analytics Overhaul Plan

## Context

The plaite-web admin dashboard at `/admin/analytics` currently shows a basic set of GA4 metrics (DAU/MAU, sessions, top events, geo, funnel, retention) via the `@google-analytics/data` Beta Data API. These charts were built before the iOS event schema was finalized.

Once the iOS app is migrated to GA4-conforming event names (`view_item`, `add_to_wishlist`, `add_to_cart`, `purchase`, `recipe_cooked`, etc.) and user properties are set (`cohort_week`, `dietary_prefs`, `subscription_tier`, `total_saves_bucket`), the dashboard needs to be overhauled to surface the metrics that actually matter: **North Star (Weekly Active Meal Planners / Weekly Cookers), retention cohorts, content performance, recommendation quality, subscription funnel, and backend health.**

**Intended outcome:**
- Dashboard reflects the Tier 1 / Tier 2 metrics from the analytics strategy report
- BigQuery-backed queries power funnels, activation analysis, and content performance (Data API has no funnel support)
- Clean separation: **overview** page shows North Star + KPIs; **analytics** page drills into subcategories
- Subscription dashboard uses RevenueCat (not Firebase paywall events) as source of truth
- Backend health panel reflects Python scraper / AI / Kroger errors

## Current state (what exists today)

| File | Purpose |
|---|---|
| `src/lib/firebase/analytics.ts` | GA4 Data API wrapper — `getActiveUsers`, `getSessions`, `getTopEvents`, `getRetentionCohorts`, `getGeoDistribution`, `getScreenViews`, `getFunnelData` |
| `src/pages/api/admin/analytics/overview.ts` | GET - DAU/MAU, sessions, screen views |
| `src/pages/api/admin/analytics/events.ts` | GET - Top events |
| `src/pages/api/admin/analytics/retention.ts` | GET - Retention cohorts |
| `src/pages/api/admin/analytics/geo.ts` | GET - Geo distribution |
| `src/pages/api/admin/analytics/funnels.ts` | GET - Funnel (approximated via per-step event counts) |
| `src/components/admin/analytics/AnalyticsDashboard.tsx` | Main React container |
| `src/components/admin/analytics/MetricCard.tsx` | KPI card |
| `src/components/admin/analytics/DauMauChart.tsx` | Line chart |
| `src/components/admin/analytics/TopEventsTable.tsx` | Event table |
| `src/components/admin/analytics/RetentionHeatmap.tsx` | Cohort grid |
| `src/components/admin/analytics/FunnelChart.tsx` | Funnel bar chart |
| `src/components/admin/analytics/GeoChart.tsx` | Geo bar chart |
| `src/components/admin/analytics/DateRangePicker.tsx` | 7/30/90 day selector |
| `src/pages/admin/analytics.astro` | Astro page mounting `AnalyticsDashboard` |
| `src/pages/admin/index.astro` | Overview landing page (currently just links to sub-pages) |

---

## Phase 1 — BigQuery integration

GA4 Data API can't do funnels, path analysis, or custom dimension queries beyond the 50-dim cap. Most of the advanced metrics need BigQuery.

### 1.1 Add BigQuery client

Install: `@google-cloud/bigquery`

Create `src/lib/bigquery/client.ts`:

```typescript
import { BigQuery } from '@google-cloud/bigquery';

let client: BigQuery | null = null;

export function getBigQuery() {
    if (client) return client;
    // Auto-detects GOOGLE_APPLICATION_CREDENTIALS env var
    client = new BigQuery();
    return client;
}

const DATASET = () => import.meta.env.BIGQUERY_DATASET || 'analytics_947488740823';

export function bqTable(date?: string) {
    if (date) return `\`plaite-production.${DATASET()}.events_${date}\``;
    // Wildcard across all daily tables
    return `\`plaite-production.${DATASET()}.events_*\``;
}
```

Add `BIGQUERY_DATASET` to `.env` (the name is assigned by Firebase when you enable the export — typically `analytics_<property_id>`).

### 1.2 BigQuery query helpers

Create `src/lib/bigquery/queries.ts`:

```typescript
import { getBigQuery, bqTable } from './client';

/**
 * Weekly Active Meal Planners — users who fired `recipe_added_to_plan` in the last N days.
 * This is the North Star metric.
 */
export async function getWeeklyActiveMealPlanners(days = 7) {
    const query = `
        SELECT COUNT(DISTINCT user_pseudo_id) AS wamp
        FROM ${bqTable()}
        WHERE event_name = 'recipe_added_to_plan'
          AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows[0]?.wamp || 0;
}

/**
 * Weekly Cookers — users who fired `recipe_cooked` in the last N days.
 * Interim North Star until Smart Shopping Lists ships.
 */
export async function getWeeklyCookers(days = 7) {
    const query = `
        SELECT COUNT(DISTINCT user_pseudo_id) AS cookers
        FROM ${bqTable()}
        WHERE event_name = 'recipe_cooked'
          AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows[0]?.cookers || 0;
}

/**
 * True onboarding funnel using onboarding_step_viewed events.
 */
export async function getOnboardingFunnel(days = 30) {
    const query = `
        WITH ordered AS (
            SELECT
                user_pseudo_id,
                event_name,
                event_timestamp,
                (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'step_name') AS step_name
            FROM ${bqTable()}
            WHERE event_name IN ('first_open', 'onboarding_step_viewed', 'onboarding_completed', 'add_to_wishlist')
              AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        )
        SELECT
            COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS installed,
            COUNT(DISTINCT CASE WHEN step_name = 'welcome' THEN user_pseudo_id END) AS welcome,
            COUNT(DISTINCT CASE WHEN step_name = 'preferences' THEN user_pseudo_id END) AS preferences,
            COUNT(DISTINCT CASE WHEN step_name = 'first_swipe' THEN user_pseudo_id END) AS first_swipe,
            COUNT(DISTINCT CASE WHEN event_name = 'onboarding_completed' THEN user_pseudo_id END) AS completed,
            COUNT(DISTINCT CASE WHEN event_name = 'add_to_wishlist' THEN user_pseudo_id END) AS first_save
        FROM ordered
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows[0];
}

/**
 * Weekly cohort retention — for each cohort week, % of users still active each subsequent week.
 */
export async function getWeeklyCohortRetention(weeks = 8) {
    const query = `
        WITH cohort AS (
            SELECT
                user_pseudo_id,
                DATE_TRUNC(DATE(TIMESTAMP_MICROS(user_first_touch_timestamp)), WEEK(MONDAY)) AS cohort_week
            FROM ${bqTable()}
            WHERE event_name = 'first_open'
              AND user_first_touch_timestamp IS NOT NULL
            GROUP BY user_pseudo_id, cohort_week
        ),
        activity AS (
            SELECT
                e.user_pseudo_id,
                c.cohort_week,
                DATE_DIFF(DATE_TRUNC(DATE(TIMESTAMP_MICROS(e.event_timestamp)), WEEK(MONDAY)), c.cohort_week, WEEK) AS week_num
            FROM ${bqTable()} e
            JOIN cohort c USING (user_pseudo_id)
            WHERE e.event_name = 'session_start'
        )
        SELECT
            cohort_week,
            COUNT(DISTINCT CASE WHEN week_num = 0 THEN user_pseudo_id END) AS week_0,
            COUNT(DISTINCT CASE WHEN week_num = 1 THEN user_pseudo_id END) AS week_1,
            COUNT(DISTINCT CASE WHEN week_num = 2 THEN user_pseudo_id END) AS week_2,
            COUNT(DISTINCT CASE WHEN week_num = 4 THEN user_pseudo_id END) AS week_4,
            COUNT(DISTINCT CASE WHEN week_num = 8 THEN user_pseudo_id END) AS week_8
        FROM activity
        WHERE cohort_week >= DATE_SUB(CURRENT_DATE(), INTERVAL ${weeks} WEEK)
        GROUP BY cohort_week
        ORDER BY cohort_week DESC
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows;
}

/**
 * Content performance — top recipes by save rate, cook rate, impression count.
 */
export async function getTopRecipes(days = 30, limit = 20) {
    const query = `
        WITH recipe_events AS (
            SELECT
                event_name,
                (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'recipe_id') AS recipe_id,
                (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_name') AS recipe_title,
                user_pseudo_id
            FROM ${bqTable()}
            WHERE event_name IN ('recipe_impression', 'view_item', 'add_to_wishlist', 'recipe_cooked')
              AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        )
        SELECT
            recipe_id,
            ANY_VALUE(recipe_title) AS title,
            COUNT(CASE WHEN event_name = 'recipe_impression' THEN 1 END) AS impressions,
            COUNT(CASE WHEN event_name = 'view_item' THEN 1 END) AS views,
            COUNT(CASE WHEN event_name = 'add_to_wishlist' THEN 1 END) AS saves,
            COUNT(CASE WHEN event_name = 'recipe_cooked' THEN 1 END) AS cooks,
            SAFE_DIVIDE(
                COUNT(CASE WHEN event_name = 'add_to_wishlist' THEN 1 END),
                NULLIF(COUNT(CASE WHEN event_name = 'recipe_impression' THEN 1 END), 0)
            ) AS save_rate
        FROM recipe_events
        WHERE recipe_id IS NOT NULL
        GROUP BY recipe_id
        ORDER BY saves DESC
        LIMIT ${limit}
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows;
}

/**
 * Recommendation quality — save rate by source surface (discover swipe vs search vs AI).
 */
export async function getRecommendationPerformance(days = 30) {
    const query = `
        WITH saves AS (
            SELECT
                user_pseudo_id,
                (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source') AS source,
                event_name
            FROM ${bqTable()}
            WHERE event_name IN ('recipe_impression', 'add_to_wishlist')
              AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        )
        SELECT
            COALESCE(source, 'unknown') AS source,
            COUNT(CASE WHEN event_name = 'recipe_impression' THEN 1 END) AS impressions,
            COUNT(CASE WHEN event_name = 'add_to_wishlist' THEN 1 END) AS saves,
            SAFE_DIVIDE(
                COUNT(CASE WHEN event_name = 'add_to_wishlist' THEN 1 END),
                NULLIF(COUNT(CASE WHEN event_name = 'recipe_impression' THEN 1 END), 0)
            ) AS save_rate
        FROM saves
        GROUP BY source
        ORDER BY impressions DESC
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows;
}

/**
 * Ecommerce purchase funnel: view_item -> add_to_cart -> begin_checkout -> purchase
 */
export async function getPurchaseFunnel(days = 30) {
    const query = `
        SELECT
            COUNT(DISTINCT CASE WHEN event_name = 'view_item' THEN user_pseudo_id END) AS viewed_item,
            COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN user_pseudo_id END) AS added_to_cart,
            COUNT(DISTINCT CASE WHEN event_name = 'begin_checkout' THEN user_pseudo_id END) AS began_checkout,
            COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN user_pseudo_id END) AS purchased
        FROM ${bqTable()}
        WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                              AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows[0];
}

/**
 * Error dashboard — error_occurred events grouped by source + type.
 */
export async function getErrorSummary(days = 7, limit = 30) {
    const query = `
        SELECT
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'error_source') AS error_source,
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'error_type') AS error_type,
            COUNT(*) AS count,
            COUNT(DISTINCT user_pseudo_id) AS affected_users
        FROM ${bqTable()}
        WHERE event_name = 'error_occurred'
          AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        GROUP BY error_source, error_type
        ORDER BY count DESC
        LIMIT ${limit}
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows;
}

/**
 * Segmentation by subscription_tier user property.
 */
export async function getMetricsBySubscriptionTier(days = 30) {
    const query = `
        WITH users AS (
            SELECT
                user_pseudo_id,
                (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'subscription_tier') AS tier
            FROM ${bqTable()}
            WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
                                  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
            GROUP BY user_pseudo_id, tier
        )
        SELECT
            COALESCE(tier, 'unknown') AS tier,
            COUNT(DISTINCT user_pseudo_id) AS users
        FROM users
        GROUP BY tier
        ORDER BY users DESC
    `;
    const [rows] = await getBigQuery().query({ query });
    return rows;
}
```

### 1.3 Caching layer

BigQuery queries are slow (1-5s) and cost ~$5/TB scanned. Add a simple in-memory TTL cache so the dashboard doesn't hammer BigQuery on every page load.

Create `src/lib/cache.ts`:

```typescript
interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>
): Promise<T> {
    const now = Date.now();
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > now) {
        return entry.value;
    }
    const value = await fn();
    store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return value;
}
```

Wrap BigQuery calls with 5-minute TTL: `cached('top-recipes-30', 300, () => getTopRecipes(30))`.

---

## Phase 2 — New API routes

Add these endpoints under `src/pages/api/admin/analytics/`:

| File | What it returns | Source |
|---|---|---|
| `north-star.ts` | `{ wamp, wamp_trend, cookers, cookers_trend }` | BigQuery (`getWeeklyActiveMealPlanners`, `getWeeklyCookers`) |
| `onboarding-funnel.ts` | Onboarding step counts | BigQuery (`getOnboardingFunnel`) |
| `cohort-retention.ts` | Weekly cohort grid | BigQuery (`getWeeklyCohortRetention`) — replaces current `retention.ts` |
| `top-recipes.ts` | Top recipes by save/cook rate | BigQuery (`getTopRecipes`) |
| `recommendation-quality.ts` | Save rate by source | BigQuery (`getRecommendationPerformance`) |
| `purchase-funnel.ts` | view_item -> purchase funnel | BigQuery (`getPurchaseFunnel`) — replaces current `funnels.ts` |
| `errors.ts` | Error summary | BigQuery (`getErrorSummary`) |
| `segments.ts` | Users by subscription tier | BigQuery (`getMetricsBySubscriptionTier`) |

Each route follows the pattern of existing routes (handle query params, call BigQuery helper, return JSON, handle errors).

**Keep the existing routes** (`overview.ts`, `events.ts`, `geo.ts`) — they're fast (Data API) and cheap. Only replace `retention.ts` and `funnels.ts` with BigQuery-powered versions for accuracy.

---

## Phase 3 — Dashboard UI overhaul

### 3.1 New sub-sections

Restructure from one `/admin/analytics` page into a sub-navigation:

```
/admin/analytics/              - Overview (North Star + KPI cards)
/admin/analytics/engagement    - Sessions, retention, activation
/admin/analytics/content       - Top recipes, recommendation quality
/admin/analytics/monetization  - Purchase funnel, paywall, subscription (RevenueCat)
/admin/analytics/acquisition   - New users, channels, geo, device
/admin/analytics/health        - Errors, backend latency, crash rate
```

Each subpage is its own `.astro` file mounting a focused React island.

### 3.2 New React components

Create under `src/components/admin/analytics/`:

| Component | Purpose |
|---|---|
| `NorthStarCard.tsx` | Big headline metric (WAMP/Cookers) with trend arrow |
| `OnboardingFunnelChart.tsx` | Horizontal funnel showing drop-off at each step |
| `WeeklyCohortHeatmap.tsx` | Weekly cohort grid (replaces day-based `RetentionHeatmap`) |
| `TopRecipesTable.tsx` | Sortable table: impressions, saves, cooks, save rate |
| `RecommendationQualityChart.tsx` | Bar chart: save rate by source |
| `PurchaseFunnelChart.tsx` | view_item -> add_to_cart -> checkout -> purchase |
| `ErrorTable.tsx` | Errors grouped by source + type, with sparkline |
| `SubscriptionTierChart.tsx` | Pie/donut: user distribution by tier |
| `KpiGrid.tsx` | Grid of 6-8 MetricCards for the overview page |

Keep existing components but refactor usage:
- `DauMauChart` → still used on `/engagement` page
- `GeoChart` → moves to `/acquisition` page
- `TopEventsTable` → moves to `/engagement` page (secondary)
- `FunnelChart` → replaced by `PurchaseFunnelChart` + `OnboardingFunnelChart`

### 3.3 Overview page redesign

`/admin/analytics/` (the landing) should show at-a-glance health:

```
+----------------------------------+
|  NORTH STAR                      |
|  Weekly Active Meal Planners     |
|  [ BIG NUMBER ]   +12% WoW       |
+----------------------------------+

+---------+ +---------+ +---------+ +---------+
| Active  | | New     | | Crash-  | | D7      |
| Users   | | Users   | | Free    | | Retention|
+---------+ +---------+ +---------+ +---------+

+---------+ +---------+ +---------+ +---------+
| Recipes | | Recipes | | Purch.  | | Trial   |
| Saved   | | Cooked  | | Funnel  | | -> Paid |
+---------+ +---------+ +---------+ +---------+

+----------------------------------+
| WAMP over time (line chart)      |
+----------------------------------+
```

Drill-down sections below link to the category subpages.

### 3.4 Engagement page

- Sessions + DAU/MAU (existing `DauMauChart`)
- Weekly cohort retention (new `WeeklyCohortHeatmap`)
- Onboarding funnel (new `OnboardingFunnelChart`)
- Activation funnel: first_open → first_save → first_cook
- Feature adoption: % MAU using each major feature
- Session length & frequency distributions

### 3.5 Content page

- Top recipes table (impressions, saves, cooks, save rate, cook rate)
- Recommendation quality: save rate by `source` (discover/search/ai)
- Content velocity: new recipes added per week (from backend scraper events)
- Recipe star rating distribution (if ratings exist)

### 3.6 Monetization page

- Purchase funnel (ecommerce)
- Paywall view → trial start rate
- Trial → paid conversion (from RevenueCat, not Firebase)
- ARPU / ARPPU (from RevenueCat)
- 90-day LTV by cohort
- Subscription tier distribution (pie)

### 3.7 Acquisition page

- New user count over time
- Acquisition source breakdown (if SKAN conversion values are logged)
- ATT opt-in rate (from `att_prompt_answered` event)
- Geo distribution (existing `GeoChart`)
- Device type breakdown

### 3.8 Health page

- Crash-free user rate (from Crashlytics via Data API `crashFreeUsersRate` metric)
- Top errors (new `ErrorTable` fed by BigQuery `error_occurred` events)
- API latency p50/p95 (from backend logs - see Phase 4)
- Backend error rate by service (Python scraper, AI, Kroger API)

---

## Phase 4 — RevenueCat integration (subscription truth)

Firebase paywall events are not reliable subscription state. Add RevenueCat as the source of truth for subscription metrics.

### 4.1 Setup

1. Sign up for RevenueCat (free tier covers up to $10k MTR)
2. Link the plaite iOS app (requires a RevenueCat SDK integration in the iOS app — out of scope for this doc, but noted)
3. Get a RevenueCat REST API key

### 4.2 Add RevenueCat client

Install: nothing (use fetch directly, or `node-fetch` if needed)

Create `src/lib/revenuecat/client.ts`:

```typescript
const BASE = 'https://api.revenuecat.com/v1';

async function rcFetch(path: string) {
    const key = import.meta.env.REVENUECAT_SECRET_KEY;
    const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`RevenueCat ${res.status}: ${await res.text()}`);
    return res.json();
}

export async function getSubscriberCount() {
    // Use the /v2/projects/{project_id}/metrics/overview endpoint or similar
    return rcFetch('/overview');
}

export async function getActiveSubscriptions() {
    return rcFetch('/subscribers/active');
}
```

### 4.3 New API route

`src/pages/api/admin/analytics/subscriptions.ts`:

Returns:
- Total active subscribers
- Trial count
- MRR
- Trial → paid conversion rate (this week / last 30 days)
- Churn rate

### 4.4 Add env var

Add to `.env.example` and `.env`:
```
REVENUECAT_SECRET_KEY=
REVENUECAT_PROJECT_ID=
```

---

## Phase 5 — Backend health monitoring

The Python backends (`plaite_backend`, `plaite_ai`) currently log nothing to analytics. They need to emit structured events so the health dashboard has data.

### 5.1 Option A: BigQuery direct writes

Have backends write structured log rows directly to a BigQuery table `plaite-production.backend_events.events`. Schema:
```
timestamp TIMESTAMP,
service STRING,       -- 'plaite_backend' | 'plaite_ai' | 'kroger_api'
event_type STRING,    -- 'scraper_success', 'scraper_fail', 'ai_latency', 'api_error'
duration_ms INT64,
error_code STRING,
error_message STRING,
metadata JSON
```

### 5.2 Option B: Firebase Admin SDK event logging

Simpler: use the Firebase Admin SDK's `measurement_protocol` to send events that flow into the same GA4 property. Not ideal (server-side events miss user context) but works.

Recommendation: **Option A** for structured monitoring, **Option B** only if backends already run as Cloud Functions with Firebase access.

### 5.3 New API route

`src/pages/api/admin/analytics/backend-health.ts`:

Queries the `backend_events` table for the last N hours and returns:
- Success rate per service
- p50 / p95 latency
- Top error codes
- Events per minute (for volume monitoring)

### 5.4 New component

`src/components/admin/analytics/BackendHealthPanel.tsx`:
- Latency line chart per service
- Error rate heatmap
- Recent errors table

---

## Phase 6 — Date range & filter overhaul

### 6.1 Global date range context

Wrap the analytics area in a React context so all components share the same selected date range without prop-drilling.

Create `src/components/admin/analytics/AnalyticsContext.tsx`:

```typescript
import { createContext, useContext, useState } from 'react';

interface Ctx {
    startDate: string;
    endDate: string;
    setRange: (start: string, end: string) => void;
    preset: '7d' | '30d' | '90d' | 'custom';
    setPreset: (p: '7d' | '30d' | '90d' | 'custom') => void;
}

const AnalyticsCtx = createContext<Ctx | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const [preset, setPreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [startDate, setStartDate] = useState('30daysAgo');
    const [endDate, setEndDate] = useState('today');
    // ...
    return <AnalyticsCtx.Provider value={{ ... }}>{children}</AnalyticsCtx.Provider>;
}

export const useAnalytics = () => {
    const ctx = useContext(AnalyticsCtx);
    if (!ctx) throw new Error('useAnalytics must be used inside AnalyticsProvider');
    return ctx;
};
```

### 6.2 Custom date picker

Current `DateRangePicker` only supports 7/30/90 presets. Extend to support custom date ranges (use native `<input type="date">`).

### 6.3 Segment filters

Add a segment dropdown to filter by `subscription_tier` (`free`, `trial`, `paid`), `cohort_week`, or `dietary_prefs`. Each filter adds a WHERE clause to BigQuery queries.

---

## Phase 7 — Loading states & error handling

Current implementation shows a single "Loading..." message for the entire page. Each chart should have its own skeleton loader.

### 7.1 Create `LoadingSkeleton.tsx`

```typescript
export function ChartSkeleton() {
    return (
        <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            height: 350, border: '1px solid #e2e8f0'
        }}>
            <div style={{
                width: '40%', height: 20, background: '#f1f5f9',
                borderRadius: 4, marginBottom: '1rem'
            }} />
            <div style={{
                width: '100%', height: 250, background: '#f8fafc', borderRadius: 8
            }} />
        </div>
    );
}
```

### 7.2 Error boundaries

Wrap each chart in an `ErrorBoundary` so one failed query doesn't break the entire page.

---

## Phase 8 — Environment variable additions

Update `.env.example` to include:

```bash
# BigQuery
BIGQUERY_DATASET=analytics_947488740823  # Find in BigQuery UI after enabling GA4 export

# RevenueCat
REVENUECAT_SECRET_KEY=
REVENUECAT_PROJECT_ID=
```

---

## File creation summary

New files to create:

```
src/lib/bigquery/client.ts
src/lib/bigquery/queries.ts
src/lib/cache.ts
src/lib/revenuecat/client.ts

src/pages/api/admin/analytics/north-star.ts
src/pages/api/admin/analytics/onboarding-funnel.ts
src/pages/api/admin/analytics/cohort-retention.ts
src/pages/api/admin/analytics/top-recipes.ts
src/pages/api/admin/analytics/recommendation-quality.ts
src/pages/api/admin/analytics/purchase-funnel.ts
src/pages/api/admin/analytics/errors.ts
src/pages/api/admin/analytics/segments.ts
src/pages/api/admin/analytics/subscriptions.ts
src/pages/api/admin/analytics/backend-health.ts

src/components/admin/analytics/AnalyticsContext.tsx
src/components/admin/analytics/NorthStarCard.tsx
src/components/admin/analytics/OnboardingFunnelChart.tsx
src/components/admin/analytics/WeeklyCohortHeatmap.tsx
src/components/admin/analytics/TopRecipesTable.tsx
src/components/admin/analytics/RecommendationQualityChart.tsx
src/components/admin/analytics/PurchaseFunnelChart.tsx
src/components/admin/analytics/ErrorTable.tsx
src/components/admin/analytics/SubscriptionTierChart.tsx
src/components/admin/analytics/KpiGrid.tsx
src/components/admin/analytics/BackendHealthPanel.tsx
src/components/admin/analytics/LoadingSkeleton.tsx

src/pages/admin/analytics/index.astro
src/pages/admin/analytics/engagement.astro
src/pages/admin/analytics/content.astro
src/pages/admin/analytics/monetization.astro
src/pages/admin/analytics/acquisition.astro
src/pages/admin/analytics/health.astro
```

Files to modify:

- `src/pages/admin/analytics.astro` → delete (replaced by `src/pages/admin/analytics/index.astro`)
- `src/pages/api/admin/analytics/retention.ts` → replace body to use BigQuery helper
- `src/pages/api/admin/analytics/funnels.ts` → replace body to use BigQuery `getPurchaseFunnel`
- `src/components/admin/AdminLayout.astro` → add sub-nav for the 6 analytics subpages (or keep single "Analytics" link and add internal tabs)
- `.env.example` → add BigQuery + RevenueCat vars

---

## Order of execution

1. **Phase 1** - BigQuery client + query helpers + caching. No UI changes yet. Verify queries work against production BigQuery export.
2. **Phase 8** - Env vars (prerequisite for everything)
3. **Phase 2** - New API routes. Test each with `curl` before touching UI.
4. **Phase 6** - Date range context (needed before Phase 3).
5. **Phase 3** - UI overhaul. Start with Overview page + `NorthStarCard`. Then engagement, then content, then the rest.
6. **Phase 7** - Loading states + error boundaries (polish pass).
7. **Phase 4** - RevenueCat integration (can happen in parallel with Phase 3).
8. **Phase 5** - Backend health monitoring (lowest priority, do last).

---

## Verification

1. **BigQuery queries** - Run each query directly in BigQuery console first, verify results match expectations.
2. **API routes** - `curl http://localhost:4321/api/admin/analytics/north-star` returns JSON with expected shape.
3. **Each subpage** - Load in browser, verify all charts render with real data.
4. **Date range switching** - Change preset, verify all charts refetch with new dates.
5. **Segment filters** - Switch subscription tier filter, verify queries apply WHERE clause.
6. **Cache behavior** - Check network tab; repeat loads within 5 min should not trigger new BigQuery queries.
7. **Error states** - Temporarily break one query (wrong dataset name), verify error boundary catches it without breaking the page.
8. **Loading states** - Throttle network in devtools, verify skeleton loaders appear.

---

## Risks & gotchas

- **BigQuery costs** - Queries scan full daily tables. Always filter by `_TABLE_SUFFIX` to limit date range. A query scanning all 30 days at ~100MB/day = 3GB = $0.015. Still cheap, but uncached queries on every page load add up.
- **Dataset name** - Firebase assigns the dataset as `analytics_<property_id>`. Verify in BigQuery UI after enabling export.
- **Latency** - Daily export lands ~24h after midnight UTC. Streaming export has ~5-minute delay but costs more. Use daily for dashboard, add "as of" timestamp so users know data freshness.
- **user_pseudo_id vs user_id** - `user_pseudo_id` is the Firebase install ID (always set); `user_id` is what you set via `setUserID` (only populated after iOS migration). Use `user_pseudo_id` for install-level analysis, `user_id` for cross-device.
- **Schema changes** - If the iOS team changes an event or custom param name, BigQuery queries break silently. Add a smoke test that validates a few expected fields are present.
- **GA4 sampling** - Free tier Data API samples above ~10M events/query. BigQuery does NOT sample. This is a reason to prefer BigQuery for anything that needs accuracy.
- **Cohort retention query complexity** - The weekly cohort query does a big join. Add a materialized view or scheduled query if it becomes slow.
- **RevenueCat required for accurate subscription data** - If RevenueCat is not integrated in iOS, the monetization page will show misleading Firebase-based numbers. Gate that page with a warning banner until RC ships.
- **Astro nested pages** - Moving from `/admin/analytics.astro` to `/admin/analytics/index.astro` is a breaking change for existing links. Add a redirect or update `AdminLayout.astro` navigation.
- **Don't leak BigQuery errors** - Always wrap with try/catch and return clean error messages; raw BigQuery errors expose internal field names.
