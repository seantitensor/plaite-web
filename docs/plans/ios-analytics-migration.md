# iOS Analytics Migration Plan

## Context

Plaite's iOS app currently logs ~100 events through a centralized `FirebaseAnalyticsService` but has three critical issues:

1. **Event names don't conform to GA4's recommended schema** — GA4's built-in ecommerce/engagement reports won't populate
2. **Zero user identification** — No `Analytics.setUserID()` or `Analytics.setUserProperty()` calls exist, so user-level cohort analysis is impossible
3. **Inconsistent naming** (`Recipe_Liked`, `RecipeView::toggleLike()::Fail`, `Cookbook_ScreenViewed`) — hard to query, error events use PascalCase with `::` separators

Analytics have only been live ~1 week and are not in a shipped version, so there is **no historical data to preserve**. Do the full rename/refactor rather than dual-tracking.

**Intended outcome:**
- GA4 recommended events power built-in reports automatically
- User IDs + properties enable subscription/cohort/dietary-preference segmentation
- Clean snake_case event taxonomy with registered custom dimensions
- Error events consolidated into a single queryable `error_occurred` event
- Ready for BigQuery export (unsampled analysis, funnels, retention)

---

## Critical files — infrastructure

| File | What it does | Changes needed |
|---|---|---|
| `plaite/Plaite/Services/Logging/Services/FirebaseAnalyticsService.swift` | Wraps `Analytics.logEvent` | Add `setUserID()` and `setUserProperty()` support |
| `plaite/Plaite/Services/Logging/Services/LogService.swift` | Protocol definition | Add `setUserID`/`setUserProperty` protocol methods |
| `plaite/Plaite/Services/Logging/LogManager.swift` | Dispatches to all LogServices | Add `setUserID()` and `setUserProperty()` methods that fan out |
| `plaite/Plaite/Services/Logging/Models/LoggableEvent.swift` | `LoggableEvent` protocol | No changes |
| `plaite/Plaite/Services/Logging/Services/CrashlyticsService.swift` | Crashlytics integration | Already exists; update to also set `userID` on Crashlytics |
| `plaite/Plaite/App/Dependencies.swift` | Wires up LogManager | No structural change; verify `CrashlyticsService` is in the services list for `.dev.firebase` and `.prod.firebase` configs |
| `plaite/Plaite/App/CoreInteractor.swift` | Already uses `trackEvent` | Add proxy methods `setUserID`, `setUserProperty` that delegate to LogManager |

---

## Phase 1 — Infrastructure (user identity + properties)

### 1.1 Update `LogService.swift` protocol

```swift
protocol LogService {
    func clear()
    func trackEvent(event: LoggableEvent)
    func setUserID(_ userID: String?)
    func setUserProperty(_ value: String?, forName name: String)
}
```

Provide default empty implementations in a protocol extension so existing services don't break:

```swift
extension LogService {
    func setUserID(_ userID: String?) {}
    func setUserProperty(_ value: String?, forName name: String) {}
}
```

### 1.2 Update `FirebaseAnalyticsService.swift`

Add:
```swift
func setUserID(_ userID: String?) {
    Analytics.setUserID(userID)
}

func setUserProperty(_ value: String?, forName name: String) {
    // GA4 user property names: max 24 chars, alphanumeric + underscore
    let safeName = sanitizeParameterKey(name).prefix(24)
    // Values: max 36 chars for user properties
    let safeValue = value.map { String($0.prefix(36)) }
    Analytics.setUserProperty(safeValue, forName: String(safeName))
}
```

### 1.3 Update `CrashlyticsService.swift`

Add:
```swift
func setUserID(_ userID: String?) {
    if let userID = userID {
        Crashlytics.crashlytics().setUserID(userID)
    }
}

func setUserProperty(_ value: String?, forName name: String) {
    Crashlytics.crashlytics().setCustomValue(value ?? "", forKey: name)
}
```

### 1.4 Update `LogManager.swift`

Add:
```swift
func setUserID(_ userID: String?) {
    for service in services {
        service.setUserID(userID)
    }
}

func setUserProperty(_ value: String?, forName name: String) {
    for service in services {
        service.setUserProperty(value, forName: name)
    }
}
```

### 1.5 Update `CoreInteractor.swift`

Add proxy methods that delegate to LogManager:
```swift
func setAnalyticsUserID(_ userID: String?) {
    logManager.setUserID(userID)
}

func setAnalyticsUserProperty(_ value: String?, forName name: String) {
    logManager.setUserProperty(value, forName: name)
}
```

---

## Phase 2 — Call sites for identity + properties

### 2.1 On login / signup (`LoggingInViewModel.swift` or `StartViewModel.swift`)

Right after a successful auth:
```swift
interactor.setAnalyticsUserID(user.uid)
interactor.setAnalyticsUserProperty(user.email, forName: "email_domain")  // just the domain, not full email
// Set the user properties from profile (see section 2.3)
applyUserProperties(from: userProfile)
```

### 2.2 On logout (`LoggingOutViewModel.swift` or `AccountViewModel.swift`)

```swift
interactor.setAnalyticsUserID(nil)
// Clear user properties
interactor.setAnalyticsUserProperty(nil, forName: "dietary_prefs")
interactor.setAnalyticsUserProperty(nil, forName: "subscription_tier")
// ...etc
```

### 2.3 After profile load + on every profile update

Create a helper somewhere central (e.g., `CoreInteractor`):
```swift
func syncAnalyticsUserProperties() {
    guard let profile = userProfile else { return }

    // Signup date - bucket as ISO week
    if let createdAt = profile.createdAt {
        let weekStr = ISO8601DateFormatter.weekString(from: createdAt)
        setAnalyticsUserProperty(weekStr, forName: "cohort_week")
    }

    // Dietary preferences - comma-joined, truncated
    let prefs = profile.dietaryPreferences.joined(separator: ",")
    setAnalyticsUserProperty(prefs, forName: "dietary_prefs")

    // Allergies (count, not contents - for privacy)
    setAnalyticsUserProperty("\(profile.allergies.count)", forName: "allergy_count")

    // Subscription tier
    setAnalyticsUserProperty(profile.subscriptionTier ?? "free", forName: "subscription_tier")

    // Measurement system
    setAnalyticsUserProperty(profile.measurementSystem, forName: "measurement_system")

    // Total saves bucket (bucketed: 0, 1-5, 6-20, 21-50, 51+)
    let savedCount = profile.savedRecipeCount ?? 0
    let bucket: String
    switch savedCount {
    case 0: bucket = "0"
    case 1...5: bucket = "1-5"
    case 6...20: bucket = "6-20"
    case 21...50: bucket = "21-50"
    default: bucket = "51+"
    }
    setAnalyticsUserProperty(bucket, forName: "total_saves_bucket")

    // Onboarding status
    setAnalyticsUserProperty(profile.isOnboarded ? "true" : "false", forName: "is_onboarded")
}
```

Call `syncAnalyticsUserProperties()` after:
- Login/signup
- Profile update (from PreferencesViewModel, AccountViewModel)
- First recipe save, first cookbook create, first shopping list create (for activation tracking)

### 2.4 Required user properties (final list)

Register all of these in Firebase Console → Analytics → Custom definitions → Custom dimensions → "User-scoped":

| Property Name | Type | Example values | Notes |
|---|---|---|---|
| `cohort_week` | User | `2026-W15` | Signup week, for cohort retention |
| `dietary_prefs` | User | `vegan,gluten_free` | Comma-joined preferences |
| `allergy_count` | User | `0`, `2`, `5` | Count, not contents (privacy) |
| `subscription_tier` | User | `free`, `trial`, `paid` | Subscription state |
| `measurement_system` | User | `metric`, `imperial` | |
| `total_saves_bucket` | User | `0`, `1-5`, `6-20`, `21-50`, `51+` | Bucketed counts |
| `is_onboarded` | User | `true`, `false` | Onboarding completion |
| `email_domain` | User | `gmail.com` | Domain only, no PII |

**Free tier limit:** 25 user-scoped custom dimensions. We're using 8, leaving headroom.

---

## Phase 3 — Event rename mapping (GA4 recommended events)

Replace these event names. The `Event` enums live inside each ViewModel; update the `eventName` switch statements.

### 3.1 Auth events

**File:** `plaite/Plaite/Core/Start/StartViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Auth_LoginSuccess` | `login` | `method: "email"` / `"google"` / `"apple"` |
| `Auth_SignupSuccess` | `sign_up` | `method: "email"` / `"google"` / `"apple"` |
| `Auth_GuestContinued` | `login` | `method: "guest"` |

### 3.2 Recipe interaction (the big one)

**File:** `plaite/Plaite/Core/Recipe/RecipeViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Recipe_Viewed` | `view_item` | `item_id: recipe_id`, `item_name: title`, `item_category: "recipe"`, `source: "discover"/"search"/"cookbook"/"ai"` |
| `Recipe_Liked` | `add_to_wishlist` | `item_id: recipe_id`, `item_category: "recipe"` |
| `Recipe_Unliked` | `remove_from_wishlist` | `item_id: recipe_id` |
| `Recipe_Shared` | `share` | `method: "link"/"sms"/"ios_share_sheet"`, `content_type: "recipe"`, `item_id: recipe_id` |
| `Recipe_AddedToCookbooks` | `recipe_added_to_cookbook` | `recipe_id`, `cookbook_count` (custom event) |
| `Recipe_IngredientsAddedToList` | `recipe_ingredients_added` | `recipe_id`, `ingredient_count` |
| `Recipe_NotesSaved` | `recipe_notes_saved` | `recipe_id` |

### 3.3 Discover / swipe

**File:** `plaite/Plaite/Core/Discover/DiscoverViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Discover_ScreenViewed` | `screen_view` | `screen_name: "discover"`, `screen_class: "DiscoverView"` |
| (new) | `recipe_swiped` | `recipe_id`, `direction: "left"/"right"`, `session_swipe_index: N` |
| `Discover_InsufficientRecipes` | `discover_insufficient_recipes` | `diets`, `allergies`, `attempts` |

### 3.4 Cookbook

**Files:** `CookbookViewModel.swift`, `CookbooksListViewModel.swift`, `CookbookSelectorViewModel.swift`, `CookbookRecipeSelectorViewModel.swift`, `CookbookView.swift`

| Current | New | Parameters |
|---|---|---|
| `Cookbook_ScreenViewed` | `screen_view` | `screen_name: "cookbook"` |
| `CookbooksList_ScreenViewed` | `screen_view` | `screen_name: "cookbooks_list"` |
| `Cookbook_Created` | `cookbook_created` | `cookbook_id` |
| `Cookbook_Deleted` | `cookbook_deleted` | `cookbook_id`, `recipe_count` |
| `Cookbook_Shared` | `share` | `content_type: "cookbook"`, `item_id: cookbook_id`, `method` |
| `Cookbook_RecipeRemoved` | `cookbook_recipe_removed` | `cookbook_id`, `recipe_id` |
| `Cookbook_FilterApplied` | `cookbook_filter_applied` | `filter_type`, `filter_value` |
| `Cookbook_SortChanged` | `cookbook_sort_changed` | `sort_type` |

### 3.5 Cooking mode

**File:** `plaite/Plaite/Core/Recipe/CookingMode/CookingModeViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `CookingMode_ScreenViewed` | `screen_view` | `screen_name: "cooking_mode"` |
| `CookingMode_Started` | `recipe_cooking_started` | `recipe_id` |
| `CookingMode_Completed` | **`recipe_cooked`** ⭐ | `recipe_id`, `duration_seconds` — **this is your North Star input** |
| `CookingMode_Exited` | `recipe_cooking_exited` | `recipe_id`, `step_index`, `total_steps` |

### 3.6 Shopping list & cart (**ecommerce funnel**)

This is the most important section. GA4's ecommerce reports depend on these exact event names and parameter shapes.

**Files:** `ShoppingListsViewModel.swift`, `ListStagingViewModel.swift`, `CartViewModel.swift`, `StoreSearchViewModel.swift`, `SearchViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `ShoppingList_ScreenViewed` | `screen_view` | `screen_name: "shopping_list"` |
| `ShoppingList_Created` | `shopping_list_created` | `shopping_list_id`, `source: "manual"/"from_recipe"` |
| `ShoppingList_Deleted` | `shopping_list_deleted` | |
| `ShoppingList_Opened` | `shopping_list_opened` | `shopping_list_id` |
| `ShoppingList_Shared` | `share` | `content_type: "shopping_list"`, `method` |
| `ShoppingList_CheckoutInitiated` | `begin_checkout` | `currency: "USD"`, `value`, `items: [...]` |
| `ShoppingList_ItemAdded` | `add_to_cart` | `currency`, `value`, `items: [{item_id, item_name, price, quantity}]` |
| `ShoppingList_ItemRemoved` | `remove_from_cart` | `currency`, `value`, `items` |
| `ShoppingList_ItemChecked` | `shopping_list_item_checked` | |
| `ShoppingList_ItemUnchecked` | `shopping_list_item_unchecked` | |
| `Cart_ScreenViewed` | `view_cart` | `currency`, `value`, `items` |
| `Cart_Clear` | `cart_cleared` | |
| `Cart_QuantityChanged` | `cart_quantity_changed` | `item_id`, `new_quantity` |
| `Cart_Checkout_Success` | **`purchase`** ⭐ | `transaction_id`, `currency: "USD"`, `value`, `items: [...]` — **required for GA4 revenue reports** |
| `Cart_Checkout_Fail` | `checkout_failed` | `error_reason` |
| `Cart_Checkout_NotLoggedIn` | `checkout_blocked_not_logged_in` | |
| `ListStaging_ScreenViewed` | `screen_view` | `screen_name: "list_staging"` |
| `ListStaging_Complete` | `list_staging_completed` | `product_count` |
| `ListStaging_ProductsLoaded` | `list_staging_products_loaded` | `product_count` |
| `ListStaging_ProductSwapped` | `list_staging_product_swapped` | |
| `ListStaging_ManualSearch` | `list_staging_manual_search` | |

**Ecommerce item shape** (for `add_to_cart`, `view_cart`, `begin_checkout`, `purchase`):
```swift
let items: [[String: Any]] = cart.items.map { item in
    [
        "item_id": item.upc ?? item.id,
        "item_name": item.name,
        "item_category": item.category ?? "grocery",
        "item_brand": item.brand ?? "",
        "price": item.price,
        "quantity": item.quantity,
    ]
}

logEvent("add_to_cart", [
    "currency": "USD",
    "value": totalValue,
    "items": items
])
```

### 3.7 Store integration (Kroger/Walmart)

**Files:** `KrogerProfileViewModel.swift`, `WalmartViewModel.swift`, `StoreSearchViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `KrogerProfile_Login_Success` | `store_login_success` | `store: "kroger"` |
| `KrogerProfile_Login_Fail` | `error_occurred` | `error_source: "kroger_login"`, `error_type` |
| `KrogerProfile_Logout_Success` | `store_logout` | `store: "kroger"` |
| `WalmartProfile_Selected` | `store_selected` | `store: "walmart"` |
| `WalmartProfile_Deselected` | `store_deselected` | `store: "walmart"` |
| `StoreSearch_Performed` | `search` | `search_term`, `search_type: "store"` |
| `StoreSearch_Selected` | `store_selected` | `store_name`, `store_id` |
| `StoreSearch_Cleared` | `store_search_cleared` | |
| `ProductSearch_Performed` | `search` | `search_term`, `search_type: "product"`, `result_count` |
| `ProductSearch_AddToCart_Success` | `add_to_cart` | (see ecommerce shape above) |

### 3.8 Preferences & settings

**Files:** `PreferencesViewModel.swift`, `SettingsViewModel.swift`, `AccountViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Settings_ScreenViewed` | `screen_view` | `screen_name: "settings"` |
| `Preferences_AllergiesSaved` | `preferences_saved` | `preference_type: "allergies"`, `count` |
| `Preferences_DietsSaved` | `preferences_saved` | `preference_type: "diets"`, `count` |
| `Preferences_MeasurementSystemSaved` | `preferences_saved` | `preference_type: "measurement"`, `value` |
| `Account_LogoutInitiated` | `account_logout_initiated` | |
| `Account_DeleteInitiated` | `account_delete_initiated` | |
| `Account_LinkedLinked` | `account_provider_linked` | `provider` |
| `Account_Upgraded` | `account_upgraded` | `from_tier`, `to_tier` |
| `Tab_Selected` | `tab_selected` | `tab_name` |

### 3.9 Recipe create/import

**Files:** `CreateRecipeViewModel.swift`, `ImportRecipeViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `CreateRecipe_ScreenViewed` | `screen_view` | `screen_name: "create_recipe"` |
| `CreateRecipe_RecipeCreated` | `recipe_created` | `recipe_id`, `source: "manual"` |
| `ImportRecipe_ScreenViewed` | `screen_view` | `screen_name: "import_recipe"` |
| `ImportRecipe_Saved` | `recipe_created` | `recipe_id`, `source: "import"` |
| `ImportRecipe_Imported` | `recipe_imported` | `source_url`, `parser: "manual"/"ai"` |

### 3.10 Paywall & subscription

**File:** `plaite/Plaite/Core/Paywall/PaywallViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Paywall_Viewed` | `paywall_viewed` | `placement: "onboarding"/"feature_gate"/"settings"` |
| `Paywall_Dismissed` | `paywall_dismissed` | `placement` |
| `Subscription_PurchaseSuccess` | `purchase` (duplicate to `subscribe`) | `transaction_id`, `currency`, `value`, `items: [{item_id: product_id, item_name: "premium_monthly"}]`, `subscription_product: product_id` |
| `completeSubscriptionPurchase_Fail` | `error_occurred` | `error_source: "subscription_purchase"`, `error_type` |

**Important:** Also log `subscribe` event if you want GA4's subscription reports to light up. Google added the `subscribe` recommended event in 2024.

### 3.11 Deep links

**File:** `plaite/Plaite/App/CoreInteractor.swift` (or wherever deep links are handled)

| Current | New | Parameters |
|---|---|---|
| `DeepLink_Opened` | `deep_link_opened` | `link_type`, `destination` |
| `DeepLink_CookbookReceived` | `deep_link_opened` | `link_type: "cookbook"`, `cookbook_id` |
| `DeepLink_ShoppingListReceived` | `deep_link_opened` | `link_type: "shopping_list"`, `shopping_list_id` |

### 3.12 Tab navigation

**File:** `plaite/Plaite/Core/TabNavigation/TabNavigationViewModel.swift`

| Current | New | Parameters |
|---|---|---|
| `Tab_Selected` | `tab_selected` | `tab_name` |

---

## Phase 4 — Error event consolidation

Currently there are ~20 different `*_Fail`, `*::Fail`, `*_NoInternet` events. Consolidate into a single `error_occurred` event with rich parameters.

**Pattern to replace:**
```swift
// BEFORE
case .saveLikeFail(let error):
    return "RecipeView::toggleLike()::Fail"

// AFTER
case .saveLikeFail(let error):
    return "error_occurred"
```

And update the `parameters` switch to include `error_source` and `error_type`:
```swift
case .saveLikeFail(let error):
    return [
        "error_source": "recipe_view",
        "error_action": "toggle_like",
        "error_type": error.eventParameters["error_code"] ?? "unknown",
        "error_message": String(describing: error).prefix(100)
    ]
```

**All `*_NoInternet` events** become:
```swift
"error_occurred" with params: {
    error_source: "<view_name>",
    error_type: "no_internet"
}
```

**Rate limit** events (`DiscoverView_RateLimited`):
```swift
"error_occurred" with params: {
    error_source: "discover_view",
    error_type: "rate_limited",
    error_code: "429"
}
```

This reduces 20+ error event names to 1 + a `error_source` + `error_type` dimension, which is cleaner to query and stays under the custom dimension cap.

---

## Phase 5 — New events to add

These don't exist yet but are required for Tier 1 metrics:

### 5.1 `recipe_swiped`
Fire in `DiscoverViewModel` on every swipe:
```swift
logEvent("recipe_swiped", [
    "recipe_id": recipe.id,
    "direction": direction.rawValue,  // "left" | "right"
    "session_swipe_index": sessionSwipeCount
])
```

### 5.2 `recipe_added_to_plan`
Fire when a recipe is added to a shopping list (once that feature ships):
```swift
logEvent("recipe_added_to_plan", [
    "recipe_id": recipe.id,
    "shopping_list_id": list.id
])
```
**This is the event that powers your North Star (Weekly Active Meal Planners).**

### 5.3 Onboarding step events
In `StartViewModel` / onboarding flow:
```swift
logEvent("onboarding_step_viewed", [
    "step_name": "welcome" | "preferences" | "allergies" | "first_swipe",
    "step_index": 1
])

logEvent("onboarding_completed", [
    "total_duration_seconds": elapsed
])
```

### 5.4 Recipe impression (for content performance)
Fire when a recipe card is shown (not just tapped). Debounce to avoid spam:
```swift
logEvent("recipe_impression", [
    "recipe_id": recipe.id,
    "surface": "discover_swipe" | "search_results" | "cookbook_grid" | "ai_recommendation",
    "position": index
])
```

### 5.5 App Tracking Transparency prompt
In `AppDelegate` or wherever the ATT prompt is shown:
```swift
import AppTrackingTransparency

ATTrackingManager.requestTrackingAuthorization { status in
    let statusString: String
    switch status {
    case .authorized: statusString = "authorized"
    case .denied: statusString = "denied"
    case .restricted: statusString = "restricted"
    case .notDetermined: statusString = "not_determined"
    @unknown default: statusString = "unknown"
    }

    DispatchQueue.main.async {
        interactor.trackEvent(eventName: "att_prompt_answered", parameters: [
            "status": statusString
        ])
    }
}
```

---

## Phase 6 — Screen view consolidation

Currently there are ~10 `*_ScreenViewed` events. GA4's native `screen_view` event is better because it populates the Screens report automatically.

Replace all `*_ScreenViewed` events with a single `screen_view` event that takes `screen_name` and `screen_class` params:

```swift
// BEFORE - per-view custom event
case .discoverScreenViewed: return "Discover_ScreenViewed"

// AFTER - standard GA4 event
// In the view's onAppear:
interactor.trackEvent(eventName: "screen_view", parameters: [
    "screen_name": "discover",
    "screen_class": "DiscoverView"
])
```

Better: create a helper on `CoreInteractor`:
```swift
func trackScreen(_ name: String, class className: String) {
    trackEvent(eventName: "screen_view", parameters: [
        "screen_name": name,
        "screen_class": className
    ])
}
```

Then in each view:
```swift
.onAppear {
    interactor.trackScreen("discover", class: "DiscoverView")
}
```

**Note:** Firebase already auto-collects `screen_view` via UIKit swizzling for UIViewController, but SwiftUI views don't trigger it automatically. Manual firing is required.

---

## Phase 7 — Activation milestones

Fire one-time "first X" events for activation tracking. Store a flag in `UserDefaults` or `userProfile` to fire only once per user:

```swift
// First save
if !profile.hasFiredFirstSave {
    logEvent("first_save", ["seconds_since_signup": elapsed])
    profile.hasFiredFirstSave = true
}

// First cook
if !profile.hasFiredFirstCook {
    logEvent("first_cook", ["seconds_since_signup": elapsed])
    profile.hasFiredFirstCook = true
}

// First shopping list
if !profile.hasFiredFirstList {
    logEvent("first_shopping_list", ["seconds_since_signup": elapsed])
    profile.hasFiredFirstList = true
}
```

These become your activation funnel — query in BigQuery to find the behavior most correlated with D7 retention.

---

## Phase 8 — Verification

After implementation:

1. **Build + run** the app locally with `.dev.firebase` config
2. **Enable Firebase Analytics DebugView**: in Xcode scheme → Run → Arguments → Add `-FIRAnalyticsDebugEnabled`
3. **Open Firebase Console → Analytics → DebugView** — you should see events streaming in real-time with correct names
4. **Verify each renamed event fires** — walk through the app manually, check DebugView:
   - Login → `login` event with `method` param
   - Swipe right → `recipe_swiped` with `direction: "right"`
   - Save recipe → `add_to_wishlist` with `item_id`
   - View recipe → `view_item` with `item_id`, `item_name`, `item_category`
   - Add item to cart → `add_to_cart` with full items array
   - Checkout → `purchase` with `transaction_id`
5. **Check user properties** — in DebugView, click the user icon; properties should be populated
6. **Check user ID** — DebugView events should show the user ID after login

### DebugView checklist

- [ ] `login` fires on successful login
- [ ] `sign_up` fires on successful signup
- [ ] `view_item` fires on recipe detail view
- [ ] `add_to_wishlist` fires on recipe like
- [ ] `recipe_swiped` fires on swipe with `direction` param
- [ ] `recipe_cooked` fires on cooking mode completion
- [ ] `add_to_cart` fires with `items` array (not just item_id)
- [ ] `view_cart` fires on cart screen open
- [ ] `begin_checkout` fires on checkout button
- [ ] `purchase` fires on successful checkout with `transaction_id` + `currency` + `value`
- [ ] `paywall_viewed` fires with `placement` param
- [ ] `search` fires from product search + store search
- [ ] `share` fires from recipe/cookbook share
- [ ] `screen_view` fires on each major view (discover, cookbook, settings, cart, shopping list)
- [ ] `error_occurred` fires on API failures with `error_source` + `error_type`
- [ ] User ID is set in DebugView header after login
- [ ] User properties populated: `cohort_week`, `dietary_prefs`, `subscription_tier`, etc.

---

## Phase 9 — GA4 Console setup (manual)

After the iOS changes are in, you (the user, not this agent) need to do these in Firebase Console:

1. **Register custom dimensions** (Admin → Custom definitions):
   - Event-scoped (for event params): `recipe_id`, `source`, `direction`, `placement`, `error_source`, `error_type`, `screen_name`, `step_name`, `surface`, `shopping_list_id`
   - User-scoped (for user properties): `cohort_week`, `dietary_prefs`, `subscription_tier`, `measurement_system`, `total_saves_bucket`, `is_onboarded`, `allergy_count`, `email_domain`
2. **Enable BigQuery export** (see `bigquery-setup.md`)
3. **Mark key events as conversions**: `sign_up`, `purchase`, `first_save`, `first_cook`, `subscribe`, `recipe_added_to_plan`

---

## File-by-file task list

For each of these files, the agent should update the `Event` enum's `eventName` and `parameters` switches per the tables above:

- [ ] `plaite/Plaite/Core/Start/StartViewModel.swift`
- [ ] `plaite/Plaite/Core/Loading/LoggingIn/LoggingInViewModel.swift`
- [ ] `plaite/Plaite/Core/Loading/LoggingOut/LoggingOutViewModel.swift`
- [ ] `plaite/Plaite/Core/Discover/DiscoverViewModel.swift`
- [ ] `plaite/Plaite/Core/Recipe/RecipeViewModel.swift`
- [ ] `plaite/Plaite/Core/Recipe/CookingMode/CookingModeViewModel.swift`
- [ ] `plaite/Plaite/Core/Recipe/CreateRecipe/CreateRecipeViewModel.swift`
- [ ] `plaite/Plaite/Core/Recipe/ImportRecipe/ImportRecipeViewModel.swift`
- [ ] `plaite/Plaite/Core/Cookbook/CookbookViewModel.swift`
- [ ] `plaite/Plaite/Core/Cookbook/CookbooksListViewModel.swift`
- [ ] `plaite/Plaite/Core/Cookbook/CookbookSelectorViewModel.swift`
- [ ] `plaite/Plaite/Core/Cookbook/CookbookRecipeSelectorViewModel.swift`
- [ ] `plaite/Plaite/Core/Cookbook/CookbookView.swift`
- [ ] `plaite/Plaite/Core/ShoppingList/ShoppingListsFromTabView/ShoppingListsViewModel.swift`
- [ ] `plaite/Plaite/Core/ShoppingList/StagingProducts/ListStagingViewModel.swift`
- [ ] `plaite/Plaite/Core/Cart/CartViewModel.swift`
- [ ] `plaite/Plaite/Core/Paywall/PaywallViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/SettingsViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/Account/AccountViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/Preferences/PreferencesViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/ConnectedStores/KrogerStore/ViewModels/KrogerProfileViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/ConnectedStores/KrogerStore/ViewModels/StoreSearchViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/ConnectedStores/KrogerStore/ViewModels/SearchViewModel.swift`
- [ ] `plaite/Plaite/Core/Settings/ConnectedStores/WalmartStore/WalmartViewModel.swift`
- [ ] `plaite/Plaite/Core/TabNavigation/TabNavigationViewModel.swift`

Infrastructure files:

- [ ] `plaite/Plaite/Services/Logging/Services/LogService.swift`
- [ ] `plaite/Plaite/Services/Logging/Services/FirebaseAnalyticsService.swift`
- [ ] `plaite/Plaite/Services/Logging/Services/CrashlyticsService.swift`
- [ ] `plaite/Plaite/Services/Logging/LogManager.swift`
- [ ] `plaite/Plaite/App/CoreInteractor.swift`

---

## Order of execution

1. **Phase 1** (infrastructure): Update `LogService`, `FirebaseAnalyticsService`, `CrashlyticsService`, `LogManager`, `CoreInteractor`. This unblocks everything.
2. **Phase 2** (user identity): Wire up `setUserID` + user properties in auth flows. Test with DebugView.
3. **Phase 3** (rename): Work through the file list. Start with `RecipeViewModel.swift` and `CartViewModel.swift` (biggest wins).
4. **Phase 4** (error consolidation): Do this in the same pass as Phase 3 — while you're in each file renaming, also consolidate `*_Fail` events.
5. **Phase 5** (new events): Add `recipe_swiped`, onboarding steps, recipe impressions, ATT prompt tracking.
6. **Phase 6** (screen views): Convert all `*_ScreenViewed` to `screen_view`.
7. **Phase 7** (activation milestones): Add `first_save`, `first_cook`, `first_shopping_list`.
8. **Phase 8** (verification): Full DebugView walkthrough.
9. **Phase 9** (manual GA4 console setup): Out of scope for agent; user does this.

---

## Risks & gotchas

- **`items` array in ecommerce events** — Firebase's `logEvent` takes `[String: Any]?` as parameters. The `items` key must be an array of dictionaries. Test carefully in DebugView; malformed items silently fail.
- **`purchase` event requires `transaction_id`** — without it, GA4 won't attribute revenue. Use the Kroger order ID.
- **User properties limit** — 25 user-scoped custom dimensions on free tier. Current plan uses 8. Don't go wild.
- **Event parameter name length** — max 40 chars. `sanitizeParameterKey()` already handles this.
- **Event name length** — max 40 chars, starts with letter. Don't use names like `shopping_list_item_added_from_recipe` (>40). Keep snake_case but concise.
- **Dual-fire on migration** — do NOT dual-fire old + new events. Just replace. The old events haven't shipped anywhere meaningful.
- **Dependencies.swift** — make sure `CrashlyticsService` is in the services array for `.dev.firebase` and `.prod.firebase` builds. It's already there based on file listing but verify.
- **Firebase Analytics DebugView is session-scoped** — once the app is launched with `-FIRAnalyticsDebugEnabled`, it persists for that install until you unset it. Safe for dev only.
