# BigQuery Setup — Manual Steps

## Context

The web admin dashboard needs BigQuery to power advanced analytics that GA4's Data API can't provide (funnels, cohort retention at scale, custom dimension queries, content performance, activation analysis). Firebase offers a free BigQuery export for GA4 data, but it needs to be turned on manually and the project/dataset needs to be configured before queries will work.

**What BigQuery unlocks that GA4 Data API can't:**
- Real funnel analysis (Data API has no `runFunnelReport`)
- Path/flow exploration (user journey analysis)
- User-level joins across events
- Custom dimensions beyond the 50-cap free tier limit
- Unlimited data retention (free tier GA4 caps at 14 months)
- Unsampled event data (Data API samples above ~10M events)
- SQL-based content performance queries
- Backend event ingestion (not possible via Firebase client SDKs)

**This guide walks you through the 8 manual steps required.** Everything here is UI/console work; no code changes. After this is done, the agent working on `web-dashboard-analytics.md` can write BigQuery queries against your real data.

---

## Prerequisites

- [ ] You have owner/editor access to the `plaite-production` Firebase project
- [ ] You have a Google Cloud account linked to the same Google identity (Firebase + GCP are linked; they should share a project)
- [ ] The service account JSON at `plaite-web/plaite-production-firebase-adminsdk-fbsvc-079e1969cd.json` is still valid
- [ ] Billing is enabled on the GCP project (BigQuery export is free but the project needs a billing account attached — GCP requires this even for $0 usage)

---

## Step 1 — Enable billing on the GCP project

**Why:** BigQuery requires a billing account to be linked even though the GA4 → BigQuery export is free. Without this, the export will fail silently.

1. Go to https://console.cloud.google.com/billing
2. Make sure the `plaite-production` project is listed under "My projects"
3. If it's not linked to a billing account:
   - Click "Link a billing account"
   - Select an existing billing account or create one
   - You will NOT be charged for the GA4 export itself
   - You WILL be charged for BigQuery storage + query costs beyond the free tier (10 GB storage + 1 TB queries/month free)

**Cost estimate for plaite at current scale:**
- Daily GA4 export: ~10-50 MB/day → ~300-1500 MB/month → **free** (under 10 GB)
- Dashboard queries: ~100 MB scanned per query with date filters → **free** (under 1 TB/month unless you query aggressively uncached)
- Expected monthly cost: **$0** for the first year

If you want hard safety, set a **budget alert**:
1. Billing → Budgets & alerts → Create budget
2. Name: "plaite BigQuery"
3. Target: $10/month
4. Alert at 50%, 90%, 100%

---

## Step 2 — Enable the BigQuery API

**Why:** The API needs to be explicitly enabled on the GCP project before any BigQuery operations work.

1. Go to https://console.cloud.google.com/apis/library/bigquery.googleapis.com?project=plaite-production
2. Click **Enable** (if already enabled, it'll say "Manage" — skip to next step)
3. Wait 30-60 seconds for it to propagate

While you're there, also enable:
- **BigQuery Data Transfer API**: https://console.cloud.google.com/apis/library/bigquerydatatransfer.googleapis.com?project=plaite-production (needed for some GA4 export features)

---

## Step 3 — Link Firebase to BigQuery (enable GA4 export)

**Why:** This is the magic step that makes GA4 start writing daily event tables to BigQuery.

1. Go to the Firebase Console: https://console.firebase.google.com/project/plaite-production/settings/integrations
2. Find the **BigQuery** card and click **Link** (or **Manage** if already linked)
3. On the "Connect BigQuery to your Firebase project" screen:
   - ✅ Check **Analytics** (this enables GA4 event export)
   - ✅ Check **Crashlytics** (recommended — gets crash data into BigQuery too)
   - Leave the others unchecked unless you want them
4. Click **Next**
5. On the configuration screen:
   - **Data location**: Choose the same region as your Firestore, ideally `us` (multi-region) or `us-central1`
   - **Daily export**: ✅ **Enable**
   - **Streaming export**: ❌ **Disable** (costs extra per row insert; daily is sufficient for dashboards)
   - **Include advertising identifiers**: Leave as default
   - **User-level data**: Include (required for cohort retention queries that use `user_pseudo_id`)
6. Click **Link to BigQuery**
7. You should see a green success message

**Important:** Data will start appearing in BigQuery **the next day** (first table created at ~4am UTC). The daily export is NOT retroactive — you'll only have data from the day you enabled it onwards. GA4 UI data still goes back further, but BigQuery starts fresh today.

---

## Step 4 — Verify the dataset exists

1. Go to https://console.cloud.google.com/bigquery?project=plaite-production
2. In the left Explorer panel, expand **plaite-production**
3. You should see a dataset named **`analytics_947488740823`** (the number is your GA4 property ID)
4. Inside that dataset, within ~24 hours you should see tables like:
   - `events_intraday_YYYYMMDD` (streaming, if enabled — skip)
   - `events_YYYYMMDD` (daily — this is what you want)
5. Click on an `events_*` table, then the **Preview** tab to see raw rows

**If the dataset doesn't appear after 24h:**
- Double-check Step 3 was completed successfully
- Go to Firebase Console → Project Settings → Integrations → BigQuery — it should say "Linked"
- Check that you have at least one active install with events firing (no events = no export)

**Write down the dataset name** — you'll need it for the `.env` file. It will be `analytics_<property_id>` where the property ID is in your `.env` as `GA_PROPERTY_ID`.

---

## Step 5 — Grant the service account BigQuery permissions

**Why:** The service account currently has Firestore + GA4 read access, but needs BigQuery query permission too.

1. Go to https://console.cloud.google.com/iam-admin/iam?project=plaite-production
2. Find the service account `firebase-adminsdk-fbsvc@plaite-production.iam.gserviceaccount.com`
3. Click the pencil (edit) icon on that row
4. Click **Add another role**
5. Add these two roles:
   - **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) — lets it read the tables
   - **BigQuery Job User** (`roles/bigquery.jobUser`) — lets it run queries
6. Click **Save**

**Test the permissions** from your terminal:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/Users/seantitensor/Documents/plaite-app/plaite-web/plaite-production-firebase-adminsdk-fbsvc-079e1969cd.json

bq query --project_id=plaite-production --use_legacy_sql=false \
'SELECT table_id FROM `plaite-production.analytics_947488740823.__TABLES__` LIMIT 5'
```

If this returns table names without errors, permissions are good. If you get "permission denied", the IAM role didn't propagate yet — wait 2-3 minutes and retry.

(If you don't have `bq` installed: `brew install --cask google-cloud-sdk` or skip this test and let the web dashboard verify later.)

---

## Step 6 — Set data retention

**Why:** By default, BigQuery keeps GA4 exported data forever, which means storage costs can creep up. For a dashboard that only cares about the last 6-12 months, you can set an auto-expiration on the dataset.

1. In BigQuery Console, click the `analytics_947488740823` dataset
2. Click **Edit details** (pencil icon at the top of the dataset view)
3. Find **Default table expiration**
4. Set to **365 days** (or however long you want to keep history)
5. Click **Save**

**Note:** This only affects NEW tables going forward. Existing tables keep their current expiration (none). You can batch-update old tables later if needed.

Alternatively, leave retention infinite if storage is cheap enough (the first ~300 MB is free).

---

## Step 7 — Add the dataset name to `.env`

Add to `/Users/seantitensor/Documents/plaite-app/plaite-web/.env`:

```bash
# BigQuery
BIGQUERY_DATASET=analytics_947488740823
```

Replace `947488740823` with the actual property ID number if different (check Step 4 for the real dataset name).

Also update `.env.example` with the variable (no value):

```bash
# BigQuery GA4 export dataset name (format: analytics_<property_id>)
BIGQUERY_DATASET=
```

---

## Step 8 — Register GA4 custom dimensions (required for the Data API paths that still exist)

**Why:** Some dashboard charts will still use the Data API (fast, no BigQuery cost) for metrics that don't need BigQuery. Those need custom dimensions registered so event parameters become queryable.

Go to https://console.firebase.google.com/project/plaite-production/analytics/app/ios:io.plaite.plaite/custom-definitions

(Or: GA4 Console → Admin → Data display → Custom definitions)

### Register these event-scoped custom dimensions

| Dimension name | Event parameter | Scope |
|---|---|---|
| Recipe ID | `recipe_id` | Event |
| Source | `source` | Event |
| Direction | `direction` | Event |
| Placement | `placement` | Event |
| Error source | `error_source` | Event |
| Error type | `error_type` | Event |
| Screen name | `screen_name` | Event |
| Step name | `step_name` | Event |
| Surface | `surface` | Event |
| Shopping list ID | `shopping_list_id` | Event |
| Method | `method` | Event |
| Content type | `content_type` | Event |
| Search type | `search_type` | Event |
| Priority | `priority` | Event |

Limit: 50 event-scoped. You'll use 14, leaving headroom.

### Register these user-scoped custom dimensions

| Dimension name | User property | Scope |
|---|---|---|
| Cohort week | `cohort_week` | User |
| Dietary prefs | `dietary_prefs` | User |
| Allergy count | `allergy_count` | User |
| Subscription tier | `subscription_tier` | User |
| Measurement system | `measurement_system` | User |
| Total saves bucket | `total_saves_bucket` | User |
| Is onboarded | `is_onboarded` | User |
| Email domain | `email_domain` | User |

Limit: 25 user-scoped. You'll use 8, leaving headroom.

**For each one:**
1. Click **Create custom dimension**
2. Enter dimension name (display name, e.g., "Recipe ID")
3. Select scope (Event or User)
4. Enter the exact event parameter or user property name (e.g., `recipe_id`) — **must match what iOS logs**
5. Add a description
6. Click **Save**

**Important:** Custom dimensions are NOT retroactive for the UI (events logged before registration won't appear filtered in reports). They ARE retroactive for BigQuery.

---

## Step 9 — Mark key events as conversions

**Why:** Conversion events get special treatment in GA4 reports (separate funnel reports, attribution, etc.). Mark your most important events:

1. Go to GA4 Admin → Events → All events
2. For each of these events, toggle **Mark as conversion**:
   - `sign_up` — new user acquired
   - `purchase` — ecommerce revenue
   - `subscribe` — subscription started
   - `first_save` — activation milestone
   - `first_cook` — value delivered
   - `recipe_added_to_plan` — North Star leading indicator

**Note:** These events won't appear in the list until at least one has fired. You may need to wait ~24h after the iOS app update is deployed and users have fired these events before you can mark them as conversions.

---

## Step 10 — Enable Crashlytics BigQuery export (optional but recommended)

If you checked Crashlytics in Step 3, you're done here. Otherwise:

1. Firebase Console → Project Settings → Integrations → BigQuery → Manage
2. Click **Enable** next to Crashlytics
3. Choose the same dataset location
4. Click **Save**

Crashes will appear in a new dataset `firebase_crashlytics` with tables per app. This lets you join crash data with analytics events for the health dashboard.

---

## Step 11 — Test a query from the command line

After ~24 hours (needed for first daily export to land), run a sanity-check query:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/Users/seantitensor/Documents/plaite-app/plaite-web/plaite-production-firebase-adminsdk-fbsvc-079e1969cd.json

bq query --project_id=plaite-production --use_legacy_sql=false <<EOF
SELECT
  event_name,
  COUNT(*) AS event_count
FROM \`plaite-production.analytics_947488740823.events_*\`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 20
EOF
```

Expected output: a list of your top events from yesterday. If you see rows, everything works.

Common errors:
- **"Not found: Table"** — The export hasn't run yet (wait 24h) or the dataset name is wrong (re-check Step 4)
- **"Permission denied"** — IAM roles from Step 5 didn't apply; re-do that step
- **"Billing not enabled"** — Step 1 incomplete
- **Zero rows** — App has no events firing, or export is delayed

---

## Step 12 — Backend event ingestion setup (later, for Phase 5 of web dashboard plan)

If/when the Python backends (`plaite_backend`, `plaite_ai`) need to write events to BigQuery, create a dedicated table:

1. BigQuery Console → plaite-production → Create dataset
2. Dataset ID: `backend_events`
3. Location: same as analytics dataset
4. Click **Create dataset**
5. Inside the new dataset, create table:
   - Table name: `events`
   - Source: Empty table
   - Schema:
     ```
     timestamp TIMESTAMP NOT NULL
     service STRING NOT NULL     -- 'plaite_backend' | 'plaite_ai' | 'kroger_api'
     event_type STRING NOT NULL  -- 'scraper_success', 'scraper_fail', 'ai_latency', etc
     duration_ms INTEGER
     error_code STRING
     error_message STRING
     metadata JSON
     ```
6. Partitioning: **timestamp** (daily)
7. Clustering: `service`, `event_type`
8. Click **Create table**

Python backends will write to this using the `google-cloud-bigquery` Python SDK with the same service account credentials.

---

## Summary checklist

Once all of this is done, you should have:

- [x] **Step 1** — Billing enabled on `plaite-production` GCP project
- [x] **Step 2** — BigQuery API enabled
- [x] **Step 3** — Firebase → BigQuery link active (Analytics + Crashlytics)
- [x] **Step 4** — Dataset `analytics_<property_id>` exists in BigQuery
- [x] **Step 5** — Service account has `bigquery.dataViewer` + `bigquery.jobUser` roles
- [x] **Step 6** — Table expiration set (or intentionally left unlimited)
- [x] **Step 7** — `BIGQUERY_DATASET` added to `.env`
- [x] **Step 8** — 14 event-scoped + 8 user-scoped custom dimensions registered in GA4
- [x] **Step 9** — Conversion events marked
- [x] **Step 10** — Crashlytics export enabled (optional)
- [x] **Step 11** — Test query succeeds with real data
- [ ] **Step 12** — (Later) Backend events dataset + table created

---

## Costs summary

**Monthly, at current plaite scale:**
| Item | Cost |
|---|---|
| GA4 → BigQuery daily export | Free |
| BigQuery storage (first 10 GB) | Free |
| BigQuery queries (first 1 TB scanned/month) | Free |
| BigQuery streaming export | Not enabled (would be ~$0.05/GB inserted) |
| **Estimated total** | **$0** |

**If the app grows 10x:**
- Storage: ~3 GB/month → still free
- Queries: ~10 GB scanned/month (well-cached dashboard) → still free
- Estimate: still $0/month

**Cost risk scenarios:**
- Someone writes an uncached loop that runs the same BigQuery query 1000x/hour → could exceed 1 TB/month = ~$5-20
- Streaming export gets accidentally enabled → ~$5-30/month at current scale
- Data retention left unlimited and app scales 100x over a year → storage could hit $5-20/month

**Mitigations:**
- Budget alerts from Step 1
- Cache layer (5-min TTL) in the web dashboard
- Query cost estimation in BigQuery UI before running any new ad-hoc queries

---

## Troubleshooting

**"The BigQuery export is linked but no tables appear"**
- It takes up to 24 hours for the first export
- Check that the app has real event activity (check GA4 realtime)
- Verify the dataset location matches what you chose

**"Queries from the dashboard return empty"**
- Event names may not match between iOS and queries. Check that iOS is using the new schema (`view_item`, not `Recipe_Viewed`)
- Custom dimensions need to be registered AND events need to fire AFTER registration for the UI (BigQuery is retroactive)
- Date range may not cover any exported tables

**"Billing account required" error when enabling API**
- Step 1 wasn't completed. Link a billing account first.

**"Quota exceeded"**
- You've hit the 1 TB free query quota. Add a cache layer or use `_TABLE_SUFFIX` filters more aggressively.

**Service account can't query**
- Roles take a few minutes to propagate. Wait 5 minutes and retry.
- Double-check the service account email is correct: `firebase-adminsdk-fbsvc@plaite-production.iam.gserviceaccount.com`

---

## Useful links

- Firebase → BigQuery linking: https://firebase.google.com/docs/projects/bigquery-export
- GA4 BigQuery schema: https://support.google.com/analytics/answer/7029846
- BigQuery pricing calculator: https://cloud.google.com/products/calculator
- GA4 custom dimensions: https://support.google.com/analytics/answer/10075209
- Conversion events: https://support.google.com/analytics/answer/9267568
- Sample GA4 BigQuery queries: https://cloud.google.com/blog/topics/developers-practitioners/learn-sql-bigquery-ga4-export
