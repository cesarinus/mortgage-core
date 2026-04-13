

# Daily Lock vs Float Decision Engine

## Summary
Create the `rate_decisions` database table and build a full-featured dashboard page for mortgage rate lock/float recommendations based on market signals.

## Step 1: Database Migration
Create `rate_decisions` table with columns: `rate_change` (numeric), `mbs_direction` (text), `trend_indicator` (text), `risk_profile` (text), `total_score` (integer), `recommendation` (text), `confidence` (text), `time_of_day` (text), `explanation` (text), `created_by` (uuid), `decision_date` (date), timestamps. Enable RLS with authenticated user policies. Enable realtime.

## Step 2: New Page — `src/pages/RateDecision.tsx`
Build the decision engine UI with:
- **Input Form**: Rate change (+/-), MBS direction (increased/decreased/unchanged), trend indicator (positive/negative/minimal), risk profile toggle (Conservative/Aggressive)
- **Scoring Engine** (client-side logic):
  - Rate up = -1, down = +1
  - MBS increased = +2, decreased = -2
  - Trend positive = +1, negative = -1
  - Time-of-day bias: before 10AM +1, 11AM-2PM flag "Reprice Window", after 3PM -1
  - Risk profile shift: Conservative -1, Aggressive +1
- **Output Display**:
  - Score gauge (green/yellow/red)
  - Recommendation badge (LOCK NOW / LOCK / WATCH / FLOAT CAUTIOUS / FLOAT)
  - Confidence level (Low/Medium/High based on score magnitude)
  - AI-generated explanation text
  - "Loan Officer Action" section with next steps
- **7-Day Trend Chart**: Line chart of recent scores from `rate_decisions` table using Recharts
- **History Table**: Recent decisions with date, score, recommendation

## Step 3: AI Commentary Parser
Create edge function `parse-market-commentary` that accepts MBS commentary text and uses Lovable AI to extract rate direction, MBS movement, and trend signals automatically. Called from the UI via an optional "Auto-Parse" button.

## Step 4: Routing & Navigation
- Add `/rate-decision` route in `App.tsx` (protected)
- Add sidebar nav link in `AppSidebar.tsx`

## Technical Details
- Scoring logic lives in a utility function `src/lib/rateDecisionEngine.ts`
- Uses existing Recharts setup for the 7-day trend chart
- Stores each decision to `rate_decisions` for analytics
- RLS: users can CRUD their own decisions, admins can access all

