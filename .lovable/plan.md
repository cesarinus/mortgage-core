## Auto-Populate Loan Scenarios

Add a one-click "Auto-Generate 3 Scenarios" button to the Loan Scenarios tab that builds Option A, B, and C from data already on the lead — no manual entry.

### Data sources (already in the CRM)
- `leads`: `property_value`, `property_address`, `loan_amount`, `loan_purpose`, `credit_range`, `annual_income`
- `mortgage_profiles`: `purchase_price`, `down_payment`, `loan_type` (via notes), HOI/tax estimates if set
- `calcLoanAmount()` and `getMndRate()` (live MND base + 0.275 spread) — already used in the tab

### The 3 generated scenarios

| | Option A — Low Down | Option B — Standard | Option C — Rate Buydown |
|---|---|---|---|
| Down payment | 3.5% (FHA) or 5% (Conv) | 10% | 20% — but redirect the extra cash from B → discount points |
| Loan type | FHA if credit < 680, else Conventional | Conventional | Conventional |
| Term | 30 yr | 30 yr | 30 yr |
| Rate | Live MND + spread | Live MND + spread | Bought-down rate (points from Δ cash B vs C) |
| MI | 0.75%/yr if LTV > 80 | 0.75%/yr if LTV > 80 | 0 |
| Taxes / HOI | from profile, else defaults (`240.75` / `166.67`) | same | same |
| PI | `calculatePI(loan, rate, term)` | same | same |
| `buydown_mode` | false | false | true, with `points_budget`, `points_purchasable`, `rate_reduction_pct`, `bought_down_rate`, `breakeven_vs_a/b_months` |

Buydown math reuses what already exists in the file: 1 point = 1% of loan, default reduction-per-point 0.25%, break-even = points cost ÷ monthly P&I savings.

If the lead is a **refinance**, Option C swaps to "No-cost refi" (lender credit, slightly higher rate) instead of buydown.

### UX

- New button in the empty state: **"Auto-Generate from Lead Data"** (next to existing "Add Scenario").
- When scenarios already exist: button moves to the header as **"Regenerate"** with a confirm dialog ("This replaces all 3 scenarios").
- After generation: scenarios are immediately editable via the existing pencil/drawer — auto-fill is a starting point, not a lock.
- A small "Auto-generated from lead data on {date}" caption under each card.
- If required data is missing (no `property_value` and no `purchase_price`), show inline prompt: "Add purchase price to the lead before auto-generating" with a link to the lead's Loan Details section.

### Implementation surface

- **New file:** `src/lib/crm/autoScenarios.ts` — pure function `buildAutoScenarios(lead, mortgageProfile) → Scenario[3]`. Unit-testable, no Supabase.
- **Edit:** `src/components/crm/tabs/LoanScenariosTab.tsx` — add `autoGenerate()` handler that calls the builder, deletes existing rows for the lead, inserts the 3 new rows, then `load()`.
- **No DB migration** — all fields already exist on `loan_scenarios`.
- **No edge function** — runs client-side, instant.

### Guardrails

- Existing manual "Add Scenario" flow untouched.
- Regenerate requires explicit confirm; never silently overwrites.
- Defaults flagged in the UI so the LO knows what to verify before sending.
- Output respects the 3-scenario cap already enforced (`scenarios.length >= 3`).

### Open question before I build

Do you want the **3 fixed archetypes above** (Low-Down / Standard / Buydown), or would you rather I pick the 3 best fits dynamically per lead (e.g., a VA option appears if employment_type is "military", USDA appears if rural ZIP, etc.)? Fixed = predictable. Dynamic = smarter but more logic to maintain.
