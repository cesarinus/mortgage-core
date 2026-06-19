import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as M from "@/lib/dashboard/metrics";

export function useDashboardMetrics() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    kpis: M.KpiCard[];
    rates: M.RateRow[];
    partners: M.ReferralPartner[];
    scorecard: M.ScorecardRow[];
    aiOpps: M.AiOpportunity[];
    forecast: M.ForecastPoint[];
    alerts: M.AlertRow[];
    copilot: M.CopilotItem[];
  }>({
    kpis: [], rates: [], partners: [], scorecard: [], aiOpps: [], forecast: [], alerts: [], copilot: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [kpis, rates, partners, scorecard, aiOpps, forecast, alerts, copilot] = await Promise.all([
        M.getKpiCards(),
        M.getRateMonitor(),
        M.getReferralPartners(5),
        M.getScorecard(user.id),
        M.getAiOpportunities(),
        M.getRevenueForecast(6),
        M.getAlerts(6),
        M.getCopilotPriorities(),
      ]);
      if (!alive) return;
      setData({ kpis, rates, partners, scorecard, aiOpps, forecast, alerts, copilot });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  return { ...data, loading };
}
