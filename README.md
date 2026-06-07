# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Income Calculation Module (Loan Officer Reference)

The Income Analysis card on the Pipeline/Deal detail page computes qualifying income from pay stub and W-2 inputs. All formulas run server-side via the `calculate-income` Edge Function and persist a snapshot row in `borrower_income_calculations`.

### Inputs (stored in `borrower_payment_details`)
- `borrower_type` — `employed` (default) or `self_employed`
- Pay stub: `pay_stub_gross_base`, `pay_stub_overtime`, `pay_stub_bonus`, `pay_stub_commission`, `pay_stub_ending_date`, `pay_stub_period_days`
- W-2 / YTD: `w2_year_1`, `w2_year_1_wages`, `w2_year_2`, `w2_year_2_wages`, `ytd_total`, `ytd_as_of_date`
- Self-employed (placeholder): `se_avg_monthly_net`

### Employee (Paid Salary) formula
Let `dim` = days in the current month of `pay_stub_ending_date`, `pd` = `pay_stub_period_days`.

```
monthly_base       = pay_stub_gross_base       / pd × dim
monthly_overtime   = pay_stub_overtime         / pd × dim   (only if variable income confirmed for last 2 years)
monthly_bonus      = pay_stub_bonus            / pd × dim   (same condition)
monthly_commission = pay_stub_commission       / pd × dim   (same condition)
monthly_income     = monthly_base + monthly_overtime + monthly_bonus + monthly_commission
annual_income      = monthly_income × 12
```

### Years Average (variable-income verification)
```
denominator_months = 24 + (pay_stub_ending_date.day / dim)
w2_total           = w2_year_1_wages + w2_year_2_wages + ytd_total
years_average      = w2_total / denominator_months
```

### Self-Employed path
```
monthly_income = se_avg_monthly_net
annual_income  = se_avg_monthly_net × 12
```
Full P&L / Balance Sheet / Cash Flow analysis is coming in a future release.

### Triggers
- Saving inputs writes to `borrower_payment_details`.
- Pressing **Calculate** invokes `/functions/v1/calculate-income` with `mode: "calculate"`, which writes a new `borrower_income_calculations` row (`source = 'manual'`, `calculated_by = 'system'`).
- Marking any `loan_conditions` row with `category = 'income'` as `received` automatically re-invokes the calculation for that lead.

### Path B (OCR) reservation
`ocr_status` and `ocr_log` columns are reserved for the upcoming OCR pipeline. The UI does not surface them, and all writes flow through the same Edge Function so the future OCR path can overwrite calculations without touching the card.
