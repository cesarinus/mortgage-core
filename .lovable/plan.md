## Mock Data Elimination & Live Data Wiring

### Audit summary

A full scan of `src/` was performed against patterns: `mock`, `dummy`, `sample`, `fake`, `placeholder`, `hardcoded`, plus inline literal arrays in dashboard/widget files.

**Mock data is concentrated almost entirely in `src/pages/Dashboard.tsx`.** Everywhere else (Leads, Pipeline, People, Contacts, AskHub, CRM workspace, Reports) already reads from Supabase. The remaining cleanup items are small and listed below.

| # | Component | File | Mock source | Real data source |
|---|---|---|---|---|
| 1 | KPI deltas (`+12.5%`, `+8.3%`, `+20%`, `+15.7%`) | `Dashboard.tsx:88-93` | Hardcoded strings | Period-over-period diff from `pipeline_opportunities` / `deals` (prior 30d vs current 30d) |
| 2 | AI Copilot "Today's Priorities" | `Dashboard.tsx:206-219` | Inline list of 4 fake borrowers | Derived from real signals: stuck leads, missing income conditions (`loan_conditions` where `category='income' AND status='missing'`), rate-drop repricing candidates, high-score leads |
| 3 | Rate Monitor | `Dashboard.tsx:99-104` | Hardcoded 4 rows | `mortgage_market_rates` table (already exists, already powers `RateDecision`) |
| 4 | Top Referral Partners | `Dashboard.tsx:111-115` | Hardcoded 3 partners | `people` joined to `person_roles` (`role_type='ReferralPartner'`) joined to linked leads → opportunities → `loan_amount` sums |
| 5 | Loan Officer Scorecard | `Dashboard.tsx:116-121` | Calls/Apps/Pre-Approvals hardcoded | `crm_calls` count this month, `pipeline_opportunities` by stage, `deals` closed |
| 6 | Alerts & Tasks | `Dashboard.tsx:366-384` | Hardcoded 4 alerts | `loan_conditions` (missing/expired) + `leads.is_stuck` |
| 7 | AI Opportunities | `Dashboard.tsx:105-110` | Hardcoded 4 buckets | Derived from `mortgage_profiles` + `loan_scenarios`: refi candidates (current rate > 0.5% above market), HELOC eligible (equity > X%), FHA streamline eligible. If no eligible records → empty state. |
| 8 | Revenue Forecast chart | `Dashboard.tsx:122-129` | Hardcoded 6 months | Sum of `pipeline_opportunities.loan_amount × 0.0125` grouped by `close_date` month for next 6 months (expected commission). |
| 9 | KPI `Mock` badges | `Dashboard.tsx:393, 513` | Visual label | Remove once wired |
| 10 | `RecommendedBusinesses` blog widget | `src/components/blog/RecommendedBusinesses.tsx` | Static recommendations | Out of scope — these are intentional editorial recommendations, not metrics. **Leave as-is** unless you tell us otherwise. |

### What to build

**Phase A — `src/lib/dashboard/metrics.ts` (new, single source of truth):**

```text
DashboardMetricsService
  getKpiCards(userId?)        → pipeline value, expected rev, closing/funded this month + WoW/MoM deltas
  getRateMonitor()             → mortgage_market_rates
  getReferralPartners(limit)   → top partners by attached loan volume
  getScorecard(userId, month)  → calls / apps / pre-approvals / funded vs targets
  getAiOpportunities(userId?)  → derived refi/HELOC/streamline candidate counts + est. revenue
  getRevenueForecast(months)   → next-N-month projected commissions
  getAlerts(userId?)           → loan_condition + stuck-lead alerts
  getCopilotPriorities(userId) → real action items
  getFunnel()                  → already-computed funnel (moved off Dashboard.tsx)
```

All other dashboards (Pipeline summary, Reports, future Mortgage dashboard) will consume these same functions — no duplicated SQL.

**Phase B — Refactor `Dashboard.tsx`:**
- Replace every hardcoded array with a hook reading from `DashboardMetricsService`.
- Remove the "Mock" badges.
- Each section shows a proper empty state when its query returns nothing.

**Phase C — Targets (scorecard):**
- New `user_targets` table or `profiles.monthly_targets jsonb` (calls/apps/pre-approvals/funded). Defaults to zeros so the scorecard shows real progress with no fake targets. Surfaced in Settings → Profile.

**Phase D — Validation:**
- Smoke check that an empty database renders empty states everywhere on `/` with no console errors.
- Verify against current production data (1 admin, 1 portal user, leads/opps in db) that numbers match raw SQL counts.

### Explicit non-goals (will NOT do unless requested)

- **Phase 9's full DashboardMetricsService for every module** — only the methods listed above; we will not pre-build placeholder services for screens that don't exist yet.
- **Phase 10 materialized views / caching** — current volume doesn't justify it; queries are indexed already. Revisit when row counts cross ~50k.
- **Phase 11 Admin Validation Mode** (showing the SQL behind each card) — separate feature. Quote separately.
- **`RecommendedBusinesses` blog widget** — editorial, not metrics.
- **Renaming, schema changes to `leads`/`pipeline_opportunities`/`deals`** — extension-only per the change-control rule. The targets table is additive.

### Deliverables

- New: `src/lib/dashboard/metrics.ts`, `src/hooks/useDashboardMetrics.ts`
- Migration: `user_targets` (or `profiles.monthly_targets` column) with RLS + GRANTs
- Edited: `src/pages/Dashboard.tsx` (all 9 mock blocks replaced)
- No other component is changed.

Approve and I'll implement Phases A–D in one pass.