import jsPDF from "jspdf";
import {
  computeBalanceSheet,
  computeCashFlow,
  computePnL,
  fmtCurrency,
  LineItem,
} from "./lineItems";

export interface PdfContext {
  borrowerName: string;
  businessName?: string | null;
  dealId: string;
  loanOfficer?: string | null;
  periodLabel?: string;
}

function header(doc: jsPDF, title: string, ctx: PdfContext) {
  doc.setFillColor(234, 88, 12); // brand orange-ish
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("NexGen Capital", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("NMLS Mortgage Brokerage · Naples, FL", 14, 19);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 34);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  let y = 42;
  doc.text(`Borrower: ${ctx.borrowerName}`, 14, y); y += 5;
  if (ctx.businessName) { doc.text(`Business: ${ctx.businessName}`, 14, y); y += 5; }
  doc.text(`Deal #: ${ctx.dealId.slice(0, 8).toUpperCase()}`, 14, y); y += 5;
  if (ctx.loanOfficer) { doc.text(`Loan Officer: ${ctx.loanOfficer}`, 14, y); y += 5; }
  if (ctx.periodLabel) { doc.text(`Period: ${ctx.periodLabel}`, 14, y); y += 5; }
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 5;
  doc.setTextColor(20, 20, 20);
  return y + 4;
}

function row(doc: jsPDF, y: number, label: string, value: string, opts?: { bold?: boolean; rule?: boolean }) {
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.text(label, 16, y);
  doc.text(value, 194, y, { align: "right" });
  if (opts?.rule) {
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y + 1.5, 196, y + 1.5);
  }
  return y + 6;
}

function sectionTitle(doc: jsPDF, y: number, text: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12);
  doc.text(text, 14, y);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  return y + 6;
}

function ensureSpace(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 285) { doc.addPage(); return 20; }
  return y;
}

function renderPnL(doc: jsPDF, y: number, items: LineItem[]): number {
  const pnl = computePnL(items);
  y = sectionTitle(doc, y, "Profit & Loss Statement");
  const income = items.filter((i) => i.section === "income");
  income.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Gross Revenue", fmtCurrency(pnl.grossRevenue), { bold: true, rule: true });
  y += 3;
  const expenses = items.filter((i) => i.section === "expense");
  expenses.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Expenses", fmtCurrency(pnl.totalExpenses), { bold: true, rule: true });
  y += 3;
  y = row(doc, y, "Net Profit", fmtCurrency(pnl.netProfit), { bold: true });
  return y + 4;
}

function renderBalanceSheet(doc: jsPDF, y: number, items: LineItem[]): number {
  const bs = computeBalanceSheet(items);
  y = sectionTitle(doc, y, "Balance Sheet");
  const cur = items.filter((i) => i.section === "asset_current");
  cur.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Current Assets", fmtCurrency(bs.currentAssets), { bold: true });
  const fx = items.filter((i) => i.section === "asset_fixed");
  fx.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Fixed Assets", fmtCurrency(bs.fixedAssets), { bold: true });
  y = row(doc, y, "TOTAL ASSETS", fmtCurrency(bs.totalAssets), { bold: true, rule: true });
  y += 3;

  const cl = items.filter((i) => i.section === "liability_current");
  cl.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Current Liabilities", fmtCurrency(bs.currentLiabilities), { bold: true });
  const ll = items.filter((i) => i.section === "liability_long");
  ll.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Long-Term Liabilities", fmtCurrency(bs.longLiabilities), { bold: true });
  y = row(doc, y, "Total Liabilities", fmtCurrency(bs.totalLiabilities), { bold: true, rule: true });
  y += 3;

  const eq = items.filter((i) => i.section === "equity");
  eq.forEach((it) => { y = ensureSpace(doc, y); y = row(doc, y, it.label, fmtCurrency(it.amount)); });
  y = row(doc, y, "Total Equity", fmtCurrency(bs.equity), { bold: true, rule: true });
  y += 3;
  y = row(doc, y, "Liabilities + Equity", fmtCurrency(bs.totalLiabilitiesAndEquity), { bold: true });
  if (!bs.balanced) {
    doc.setTextColor(200, 0, 0);
    y = row(doc, y, "⚠ Balance sheet does not balance", "");
    doc.setTextColor(20, 20, 20);
  }
  return y + 4;
}

function renderCashFlow(doc: jsPDF, y: number, items: LineItem[]): number {
  const cf = computeCashFlow(items);
  y = sectionTitle(doc, y, "Cash Flow Summary");
  y = row(doc, y, "Total Deposits", fmtCurrency(cf.totalDeposits));
  y = row(doc, y, "Total Expenses", fmtCurrency(cf.totalExpenses));
  y = row(doc, y, "Average Monthly Deposits", fmtCurrency(cf.averageMonthlyDeposits));
  y = row(doc, y, "Net Cash Flow", fmtCurrency(cf.netCashFlow), { bold: true, rule: true });
  return y + 4;
}

export function generatePnlPdf(items: LineItem[], ctx: PdfContext): jsPDF {
  const doc = new jsPDF();
  const y = header(doc, "YTD Profit & Loss", ctx);
  renderPnL(doc, y, items);
  return doc;
}

export function generateBalanceSheetPdf(items: LineItem[], ctx: PdfContext): jsPDF {
  const doc = new jsPDF();
  const y = header(doc, "Balance Sheet", ctx);
  renderBalanceSheet(doc, y, items);
  return doc;
}

export function generateCombinedPdf(items: LineItem[], ctx: PdfContext): jsPDF {
  const doc = new jsPDF();
  let y = header(doc, "Financial Package", ctx);
  y = renderPnL(doc, y, items);
  y = ensureSpace(doc, y, 60);
  y = renderBalanceSheet(doc, y, items);
  y = ensureSpace(doc, y, 40);
  renderCashFlow(doc, y, items);
  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}