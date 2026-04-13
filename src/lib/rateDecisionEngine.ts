export type MbsDirection = "increased" | "decreased" | "unchanged";
export type TrendIndicator = "positive" | "negative" | "minimal";
export type RiskProfile = "conservative" | "aggressive";
export type Recommendation = "lock_now" | "lock" | "watch" | "float_cautious" | "float";
export type Confidence = "low" | "medium" | "high";

export interface DecisionInput {
  rateChange: number;
  mbsDirection: MbsDirection;
  trendIndicator: TrendIndicator;
  riskProfile: RiskProfile;
}

export interface DecisionOutput {
  totalScore: number;
  recommendation: Recommendation;
  confidence: Confidence;
  timeOfDay: string;
  repriceWindow: boolean;
  explanation: string;
}

function getTimeOfDayBias(): { bias: number; label: string; repriceWindow: boolean } {
  const hour = new Date().getHours();
  if (hour < 10) return { bias: 1, label: "Pre-Market (before 10 AM)", repriceWindow: false };
  if (hour >= 11 && hour <= 14) return { bias: 0, label: "Reprice Window (11 AM–2 PM)", repriceWindow: true };
  if (hour >= 15) return { bias: -1, label: "End of Day (after 3 PM)", repriceWindow: false };
  return { bias: 0, label: "Mid-Morning", repriceWindow: false };
}

export function calculateDecision(input: DecisionInput): DecisionOutput {
  let score = 0;

  // Rate change scoring
  if (input.rateChange > 0) score -= 1;
  else if (input.rateChange < 0) score += 1;

  // MBS direction scoring
  if (input.mbsDirection === "increased") score += 2;
  else if (input.mbsDirection === "decreased") score -= 2;

  // Trend scoring
  if (input.trendIndicator === "positive") score += 1;
  else if (input.trendIndicator === "negative") score -= 1;

  // Time of day bias
  const timeBias = getTimeOfDayBias();
  score += timeBias.bias;

  // Risk profile shift
  if (input.riskProfile === "conservative") score -= 1;
  else if (input.riskProfile === "aggressive") score += 1;

  // Determine recommendation
  let recommendation: Recommendation;
  if (score >= 2) recommendation = "float";
  else if (score >= 0) recommendation = "float_cautious";
  else if (score >= -2) recommendation = "watch";
  else recommendation = "lock_now";

  // Confidence based on score magnitude
  const absScore = Math.abs(score);
  let confidence: Confidence;
  if (absScore >= 4) confidence = "high";
  else if (absScore >= 2) confidence = "medium";
  else confidence = "low";

  // Generate explanation
  const parts: string[] = [];
  if (input.rateChange > 0) parts.push("Rates moved up, signaling selling pressure");
  else if (input.rateChange < 0) parts.push("Rates moved down, a positive signal for borrowers");
  else parts.push("Rates are flat today");

  if (input.mbsDirection === "increased") parts.push("MBS prices are rising, which typically pushes rates lower");
  else if (input.mbsDirection === "decreased") parts.push("MBS prices are falling, which typically pushes rates higher");

  if (input.trendIndicator === "positive") parts.push("Overall market trend is positive");
  else if (input.trendIndicator === "negative") parts.push("Overall market trend is negative");

  if (timeBias.repriceWindow) parts.push("⚠️ Currently in the reprice window (11 AM–2 PM)");
  if (timeBias.bias > 0) parts.push("Early morning bias favors floating");
  if (timeBias.bias < 0) parts.push("Late day — consider locking to protect gains");

  parts.push(`Risk profile: ${input.riskProfile === "conservative" ? "Conservative (bias toward locking)" : "Aggressive (bias toward floating)"}`);

  return {
    totalScore: score,
    recommendation,
    confidence,
    timeOfDay: timeBias.label,
    repriceWindow: timeBias.repriceWindow,
    explanation: parts.join(". ") + ".",
  };
}

export function getRecommendationLabel(rec: Recommendation): string {
  const map: Record<Recommendation, string> = {
    lock_now: "LOCK NOW",
    lock: "LOCK",
    watch: "WATCH",
    float_cautious: "FLOAT (Cautious)",
    float: "FLOAT",
  };
  return map[rec];
}

export function getRecommendationColor(rec: Recommendation): string {
  const map: Record<Recommendation, string> = {
    lock_now: "bg-red-600 text-white",
    lock: "bg-orange-500 text-white",
    watch: "bg-yellow-500 text-black",
    float_cautious: "bg-emerald-400 text-black",
    float: "bg-green-600 text-white",
  };
  return map[rec];
}

export function getScoreColor(score: number): string {
  if (score >= 2) return "text-green-600";
  if (score >= 0) return "text-emerald-500";
  if (score >= -2) return "text-yellow-600";
  return "text-red-600";
}

export function getConfidenceBadge(conf: Confidence): string {
  const map: Record<Confidence, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-green-100 text-green-800",
  };
  return map[conf];
}

export function getLoanOfficerActions(rec: Recommendation): string[] {
  const actions: Record<Recommendation, string[]> = {
    lock_now: [
      "Lock all pending rate locks immediately",
      "Notify borrowers with expiring locks",
      "Contact pipeline borrowers about locking",
    ],
    lock: [
      "Consider locking rates for risk-averse borrowers",
      "Review pipeline for locks expiring within 7 days",
    ],
    watch: [
      "Monitor MBS prices through the afternoon",
      "Hold off on new locks unless borrower requests",
      "Check for reprice alerts from lenders",
    ],
    float_cautious: [
      "Float with caution — set price alerts",
      "Re-evaluate after next MBS price update",
    ],
    float: [
      "Float rates — market conditions favor waiting",
      "Advise borrowers that rates may improve",
      "Set a floor rate to auto-lock if conditions worsen",
    ],
  };
  return actions[rec];
}
