## The bug

`SendToLosButton` reads `loan_amount` from only two places:

```ts
const loanAmount = opportunity?.loan_amount ?? lead?.loan_amount;
```

For lead `ac9d7aaf…`:
- `leads.loan_amount` = empty
- No `pipeline_opportunities` row exists (lead never moved to pipeline)
- But `mortgage_profiles` HAS the data:
  - `purchase_price` = 500,000
  - `down_payment` = 50,000
  - `notes.loan_type` = "conventional"

The button never looks at `mortgage_profiles`, so it shows "Loan amount missing" and stays disabled. The intake form also never wrote a computed `loan_amount` back to `leads`. That's the root cause.

## Fix

### 1. Add a shared calculator `src/lib/loan/calcLoanAmount.ts`

```ts
type Inputs = {
  loan_type?: string | null;          // 'conventional' | 'fha' | 'va' | 'usda' | ...
  purchase_price?: number | null;     // from mortgage_profiles or lead.property_value
  down_payment?: number | null;       // dollar amount
};

export function calcLoanAmount({ loan_type, purchase_price, down_payment }: Inputs): number | null {
  if (!purchase_price || purchase_price <= 0) return null;
  const type = (loan_type || 'conventional').toLowerCase();

  if (type === 'fha') {
    // Min 3.5% down; base = price - max(down_payment, 3.5%)
    const minDown = purchase_price * 0.035;
    const dp = Math.max(down_payment ?? minDown, minDown);
    const base = purchase_price - dp;
    // UFMIP 1.75% financed on top
    return Math.round(base * 1.0175);
  }

  // Conventional / default: price - down_payment
  const dp = down_payment ?? 0;
  return Math.max(0, Math.round(purchase_price - dp));
}
```

### 2. Update `SendToLosButton.tsx`

- Accept an optional `mortgageProfile` prop (or fetch it inside the component if not passed).
- Compute fallback order:
  1. `opportunity?.loan_amount`
  2. `lead?.loan_amount`
  3. `calcLoanAmount({ loan_type: profile.notes?.loan_type, purchase_price: profile.purchase_price ?? lead.property_value, down_payment: profile.down_payment })`
- Use the computed value in the Zapier payload and in the "missing field" check.

### 3. Pass `mortgageProfile` from `RecordWorkspace.tsx`

`RecordWorkspace` already loads the lead — add a sibling query for `mortgage_profiles` by `lead_id` and pass it to `SendToLosButton` and `LosSyncCard`.

### 4. Backfill the field going forward

In `src/lib/crm/leadIntake.ts` (and `SmartLeadForm` if it writes directly), when a lead is created/updated with `property_value` + a down payment + loan type, also write the computed `loan_amount` onto `leads.loan_amount`. This keeps Pipeline, Dashboard, and Send-to-LOS consistent without needing the profile join everywhere.

### 5. One-off data repair

After the code is in place, run a single UPDATE so the existing stuck lead becomes sendable:

```sql
UPDATE public.leads l
SET loan_amount = 450000  -- 500000 - 50000, conventional
WHERE id = 'ac9d7aaf-343f-44af-82aa-2b0f7fdfdffc';
```
(Or a generic UPDATE … FROM mortgage_profiles to fix all historical rows in one shot.)

## Open question before I build

Your FHA wording — "Property Value - 3.5% or Down Payment + 1.75%" — I'm interpreting as the standard FHA formula:

> base loan = purchase_price − max(down_payment, 3.5% of price), then add 1.75% UFMIP financed on top.

If you actually want a simpler literal reading (e.g., `purchase_price * 0.965` ignoring user down payment, or `down_payment * 1.0175`), say so and I'll change the formula. Everything else above stands either way.
