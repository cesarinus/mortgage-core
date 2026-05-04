const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface QuotePayload {
  to: string;
  name: string;
  loanType: string;
  homePrice: number;
  downPayment: number;
  downPaymentPct: number;
  loanAmount: number;
  termYears: number;
  rate: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  pmiRequired: boolean;
  totalMonthly: number;
  totalInterest: number;
}

const fmtUSD = (n: number, frac = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n || 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service is not configured");
    }

    const body = (await req.json()) as Partial<QuotePayload>;
    const to = String(body.to || "").trim().slice(0, 255);
    if (!EMAIL_RE.test(to)) {
      return new Response(JSON.stringify({ error: "Valid recipient email required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(body.name || "").trim().slice(0, 100) || "there";
    const loanType = String(body.loanType || "").trim().slice(0, 100);
    const homePrice = Number(body.homePrice) || 0;
    const downPayment = Number(body.downPayment) || 0;
    const downPaymentPct = Number(body.downPaymentPct) || 0;
    const loanAmount = Number(body.loanAmount) || 0;
    const termYears = Number(body.termYears) || 0;
    const rate = Number(body.rate) || 0;
    const monthlyPI = Number(body.monthlyPI) || 0;
    const monthlyTax = Number(body.monthlyTax) || 0;
    const monthlyInsurance = Number(body.monthlyInsurance) || 0;
    const monthlyPMI = Number(body.monthlyPMI) || 0;
    const pmiRequired = Boolean(body.pmiRequired);
    const totalMonthly = Number(body.totalMonthly) || 0;
    const totalInterest = Number(body.totalInterest) || 0;

    const pmiRow = pmiRequired
      ? `<tr><td style="padding:6px 0;color:#475569;">PMI</td><td style="padding:6px 0;text-align:right;">${fmtUSD(monthlyPMI, 2)}</td></tr>`
      : "";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#0f172a;">
        <h2 style="color:#f97316;margin:0 0 4px;">Your Mortgage Quote</h2>
        <p style="margin:0 0 20px;color:#475569;">Hi ${name}, here's the estimate you generated with NexGen Capital.</p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9a3412;">Estimated Monthly Payment</div>
          <div style="font-size:34px;font-weight:700;color:#ea580c;margin-top:4px;">${fmtUSD(totalMonthly, 2)}</div>
        </div>

        <h3 style="font-size:14px;margin:0 0 8px;color:#0f172a;">Loan Details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
          <tr><td style="padding:6px 0;color:#475569;">Loan Type</td><td style="padding:6px 0;text-align:right;">${loanType}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Home Price</td><td style="padding:6px 0;text-align:right;">${fmtUSD(homePrice)}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Down Payment</td><td style="padding:6px 0;text-align:right;">${fmtUSD(downPayment)} (${downPaymentPct.toFixed(1)}%)</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Loan Amount</td><td style="padding:6px 0;text-align:right;">${fmtUSD(loanAmount)}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Term</td><td style="padding:6px 0;text-align:right;">${termYears} years</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Interest Rate</td><td style="padding:6px 0;text-align:right;">${rate.toFixed(3)}%</td></tr>
        </table>

        <h3 style="font-size:14px;margin:0 0 8px;color:#0f172a;">Monthly Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
          <tr><td style="padding:6px 0;color:#475569;">Principal &amp; Interest</td><td style="padding:6px 0;text-align:right;">${fmtUSD(monthlyPI, 2)}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Property Tax</td><td style="padding:6px 0;text-align:right;">${fmtUSD(monthlyTax, 2)}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Homeowners Insurance</td><td style="padding:6px 0;text-align:right;">${fmtUSD(monthlyInsurance, 2)}</td></tr>
          ${pmiRow}
          <tr><td style="padding:10px 0 0;font-weight:600;border-top:1px solid #e2e8f0;">Total Monthly</td><td style="padding:10px 0 0;text-align:right;font-weight:700;color:#ea580c;border-top:1px solid #e2e8f0;">${fmtUSD(totalMonthly, 2)}</td></tr>
        </table>

        <p style="font-size:13px;color:#475569;">Total Interest Paid: <strong>${fmtUSD(totalInterest)}</strong></p>

        <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;">
          Ready to take the next step? Reply to this email or call your loan officer to lock in a personalized rate — no credit check required.
        </div>

        <p style="margin-top:24px;font-size:11px;color:#94a3b8;">Estimates only. Not a loan commitment. NexGen Capital · NMLS #1766649</p>
      </div>
    `;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "NexGen Capital <onboarding@resend.dev>",
        to: [to],
        bcc: ["avantifundings@gmail.com"],
        subject: `Your NexGen Capital mortgage quote — ${fmtUSD(totalMonthly, 2)}/mo`,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[EMAIL-QUOTE] Resend error:", errorText);
      throw new Error(`Failed to send: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[EMAIL-QUOTE] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});