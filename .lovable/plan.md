## Dynamic Mortgage Rate Engine

Centralize the mortgage rate used across Snapshot, DTI, Affordability, and Lock/Float so it refreshes daily from Mortgage News Daily (+0.125% buffer) instead of the hardcoded 6.75%.

### 1. Database (migration)
New table `mortgage_market_rates`:
- `source` text, `rate_30yr` numeric, `adjusted_rate` numeric, `fetched_at` timestamptz, `active` boolean, `is_manual_override` boolean
- RLS: SELECT for `authenticated`; INSERT/UPDATE restricted to admins (`has_role('admin')`); service_role full
- GRANT SELECT to authenticated; ALL to service_role
- Index on `(active, fetched_at desc)`
- Seed one row at 6.75 + 0.125 = 6.875 so the app has a fallback immediately

### 2. Edge function `update-mortgage-rates`
- Fetch `https://www.mortgagenewsdaily.com/mortgage-rates` (HTML), parse the 30-Year Fixed value via regex
- Fallback chain: MND → FRED (MORTGAGE30US, public CSV) → keep previous row
- Compute `adjusted_rate = rate_30yr + 0.125`
- In a transaction: set existing rows `active = false`, insert new active row
- `verify_jwt = false` so cron + admin "Refresh Now" can both call it
- Daily pg_cron job at 13:00 UTC (post-MND update) via `pg_net`

### 3. Client service `src/lib/mortgage/rateService.ts`
- `getCurrentMortgageRate()` — reads newest `active` row, falls back to 6.875
- `getCurrentRateMeta()` — returns `{ adjusted_rate, rate_30yr, source, fetched_at, is_manual_override }`
- Tiny in-memory cache (5 min) to avoid repeat queries per page

### 4. Payment + DTI calculator `src/lib/mortgage/estimatePayment.ts`
New shared async helper used by intake save and snapshot display:
```
pi = (principal * r) / (1 - (1+r)^-360)
taxes  = propertyTaxes ?? price * 0.0125
ins    = homeownersInsurance ?? 1800
hoa    = hoaFees ?? 0
pmi    = ltv > 0.8 ? principal * 0.005 / 12 : 0
payment = round(pi + taxes/12 + ins/12 + hoa + pmi)
frontDti = payment / grossMonthly
backDti  = (payment + liabilitiesMonthly) / grossMonthly
```
- Update `leadIntake.ts` `estimateMonthlyPayment` to be async and use this
- Persist `front_end_dti` / `back_end_dti` into `mortgage_profiles.notes` JSON (schema-extension only, no new columns to keep within strict change control)

### 5. UI changes
- `CatchUpTab` Mortgage Snapshot: new "Live Market Rate" card showing adjusted rate, source, last updated. Recompute payment on render using the live rate when underlying inputs (price/down/taxes/ins/hoa) are present, instead of the stale stored value
- `RateDecision` page: swap its base-rate source to `getCurrentMortgageRate()` so Lock/Float stays in sync
- Admin: new section in `SettingsPage` → "Market Rates" with current source/rate/adjusted/last update, manual override numeric input, and Refresh Now button (calls the edge function)

### 6. Files touched
- `supabase/migrations/<ts>_mortgage_market_rates.sql` (new)
- `supabase/functions/update-mortgage-rates/index.ts` (new)
- `supabase/config.toml` — add `[functions.update-mortgage-rates] verify_jwt = false`
- `src/lib/mortgage/rateService.ts` (new)
- `src/lib/mortgage/estimatePayment.ts` (new)
- `src/lib/crm/leadIntake.ts` — async payment estimate
- `src/components/crm/tabs/CatchUpTab.tsx` — Live Market Rate card + live recompute
- `src/pages/RateDecision.tsx` — consume live rate
- `src/components/settings/MarketRatesSettings.tsx` (new) + wire into `SettingsPage`

### Notes / open questions
- MND has no public API; scraping their HTML is fragile. The function will tolerate failure and fall back to FRED + last known rate. If you'd rather skip scraping and use FRED only (weekly Freddie Mac PMMS), say the word.
- Keeping all schema additions in one new table per the change-control policy; `front_end_dti` / `back_end_dti` live in the existing `mortgage_profiles.notes` JSON.
