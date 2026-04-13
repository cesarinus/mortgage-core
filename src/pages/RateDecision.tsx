import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Shield, Zap, BarChart3 } from "lucide-react";
import {
  calculateDecision,
  getRecommendationLabel,
  getRecommendationColor,
  getScoreColor,
  getConfidenceBadge,
  getLoanOfficerActions,
  type MbsDirection,
  type TrendIndicator,
  type RiskProfile,
  type DecisionOutput,
} from "@/lib/rateDecisionEngine";

export default function RateDecision() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rateChange, setRateChange] = useState("0");
  const [mbsDirection, setMbsDirection] = useState<MbsDirection>("unchanged");
  const [trendIndicator, setTrendIndicator] = useState<TrendIndicator>("minimal");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("conservative");
  const [commentary, setCommentary] = useState("");
  const [result, setResult] = useState<DecisionOutput | null>(null);
  const [parsing, setParsing] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["rate-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (decision: DecisionOutput) => {
      const { error } = await supabase.from("rate_decisions").insert({
        rate_change: parseFloat(rateChange),
        mbs_direction: mbsDirection,
        trend_indicator: trendIndicator,
        risk_profile: riskProfile,
        total_score: decision.totalScore,
        recommendation: decision.recommendation,
        confidence: decision.confidence,
        time_of_day: decision.timeOfDay,
        explanation: decision.explanation,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-decisions"] });
      toast({ title: "Decision saved", description: "Today's rate decision has been recorded." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save decision.", variant: "destructive" }),
  });

  const handleCalculate = () => {
    const decision = calculateDecision({
      rateChange: parseFloat(rateChange) || 0,
      mbsDirection,
      trendIndicator,
      riskProfile,
    });
    setResult(decision);
  };

  const handleSave = () => {
    if (result) saveMutation.mutate(result);
  };

  const handleAutoParse = async () => {
    if (!commentary.trim()) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-market-commentary", {
        body: { commentary: commentary.trim() },
      });
      if (error) throw error;
      if (data?.rateDirection) {
        setRateChange(data.rateDirection === "up" ? "0.01" : data.rateDirection === "down" ? "-0.01" : "0");
      }
      if (data?.mbsDirection) setMbsDirection(data.mbsDirection);
      if (data?.trendIndicator) setTrendIndicator(data.trendIndicator);
      toast({ title: "Parsed!", description: "Market signals extracted from commentary." });
    } catch {
      toast({ title: "Parse failed", description: "Could not extract signals.", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const trendData = [...history]
    .reverse()
    .slice(-7)
    .map((d) => ({
      date: new Date(d.decision_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: d.total_score,
      rec: d.recommendation,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lock vs Float Decision Engine</h1>
        <p className="text-muted-foreground">Daily mortgage rate lock/float recommendation based on market signals</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Market Inputs</CardTitle>
            <CardDescription>Enter today's market data or paste MBS commentary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>30Y Rate Change</Label>
              <Input
                type="number"
                step="0.01"
                value={rateChange}
                onChange={(e) => setRateChange(e.target.value)}
                placeholder="e.g. -0.02"
              />
            </div>

            <div className="space-y-2">
              <Label>MBS Direction</Label>
              <Select value={mbsDirection} onValueChange={(v) => setMbsDirection(v as MbsDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="increased">↑ Increased (Bullish)</SelectItem>
                  <SelectItem value="decreased">↓ Decreased (Bearish)</SelectItem>
                  <SelectItem value="unchanged">— Unchanged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Market Trend</Label>
              <Select value={trendIndicator} onValueChange={(v) => setTrendIndicator(v as TrendIndicator)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="minimal">Minimal / Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Risk Profile</Label>
                <p className="text-xs text-muted-foreground">
                  {riskProfile === "conservative" ? "Bias toward locking" : "Bias toward floating"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={riskProfile === "aggressive"}
                  onCheckedChange={(v) => setRiskProfile(v ? "aggressive" : "conservative")}
                />
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button className="w-full" onClick={handleCalculate}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Calculate Decision
            </Button>

            <div className="border-t pt-4 space-y-2">
              <Label>MBS Commentary (Auto-Parse)</Label>
              <Textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="Paste Mortgage News Daily commentary here..."
                rows={3}
              />
              <Button variant="outline" className="w-full" onClick={handleAutoParse} disabled={parsing || !commentary.trim()}>
                {parsing ? "Parsing..." : "Auto-Parse Commentary"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Score & Recommendation */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                    <p className={`text-5xl font-bold ${getScoreColor(result.totalScore)}`}>
                      {result.totalScore > 0 ? "+" : ""}{result.totalScore}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Recommendation</p>
                    <Badge className={`text-lg px-4 py-1.5 ${getRecommendationColor(result.recommendation)}`}>
                      {getRecommendationLabel(result.recommendation)}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Confidence</p>
                    <Badge className={`text-sm px-3 py-1 ${getConfidenceBadge(result.confidence)}`}>
                      {result.confidence.toUpperCase()}
                    </Badge>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {result.timeOfDay}
                    </div>
                    {result.repriceWindow && (
                      <div className="flex items-center justify-center gap-1 mt-1 text-xs text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        Reprice Window Active
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
                </CardContent>
              </Card>

              {/* Loan Officer Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loan Officer Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {getLoanOfficerActions(result.recommendation).map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-4" onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Today's Decision"}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">Enter market data and click Calculate</p>
                <p className="text-sm">Your lock/float recommendation will appear here</p>
              </CardContent>
            </Card>
          )}

          {/* 7-Day Trend */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  7-Day Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* History Table */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Rate Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(0, 10).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{new Date(d.decision_date).toLocaleDateString()}</TableCell>
                        <TableCell className={`font-semibold ${getScoreColor(d.total_score)}`}>
                          {d.total_score > 0 ? "+" : ""}{d.total_score}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRecommendationColor(d.recommendation as any)} text-xs`}>
                            {getRecommendationLabel(d.recommendation as any)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{d.confidence}</Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          {Number(d.rate_change) > 0 ? <TrendingUp className="h-3 w-3 text-red-500" /> :
                           Number(d.rate_change) < 0 ? <TrendingDown className="h-3 w-3 text-green-500" /> :
                           <Minus className="h-3 w-3" />}
                          {d.rate_change}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
