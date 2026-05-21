export type FinanceSection =
  | "income"
  | "expense"
  | "asset_current"
  | "asset_fixed"
  | "liability_current"
  | "liability_long"
  | "equity";

export interface LineItem {
  id: string;
  section: FinanceSection;
  category: string;
  label: string;
  amount: number;
}

export const SECTION_LABELS: Record<FinanceSection, string> = {
  income: "Income",
  expense: "Expenses",
  asset_current: "Current Assets",
  asset_fixed: "Fixed Assets",
  liability_current: "Current Liabilities",
  liability_long: "Long-Term Liabilities",
  equity: "Equity",
};

export const DEFAULT_TEMPLATE: Omit<LineItem, "id" | "amount">[] = [
  // Income
  { section: "income", category: "Revenue", label: "Gross Revenue" },
  { section: "income", category: "Revenue", label: "Service Income" },
  { section: "income", category: "Revenue", label: "Other Business Income" },
  // Expenses
  { section: "expense", category: "Operating", label: "Advertising" },
  { section: "expense", category: "Operating", label: "Auto" },
  { section: "expense", category: "Operating", label: "Insurance" },
  { section: "expense", category: "Operating", label: "Payroll" },
  { section: "expense", category: "Operating", label: "Rent" },
  { section: "expense", category: "Operating", label: "Utilities" },
  { section: "expense", category: "Operating", label: "Office Expenses" },
  { section: "expense", category: "Operating", label: "Supplies" },
  { section: "expense", category: "Operating", label: "Taxes & Licenses" },
  { section: "expense", category: "Operating", label: "Repairs" },
  { section: "expense", category: "Operating", label: "Travel" },
  { section: "expense", category: "Operating", label: "Meals" },
  { section: "expense", category: "Operating", label: "Contractor Payments" },
  { section: "expense", category: "Operating", label: "Bank Charges" },
  { section: "expense", category: "Operating", label: "Miscellaneous" },
  // Current Assets
  { section: "asset_current", category: "Cash", label: "Cash" },
  { section: "asset_current", category: "Cash", label: "Business Checking" },
  { section: "asset_current", category: "AR", label: "Accounts Receivable" },
  { section: "asset_current", category: "Inventory", label: "Inventory" },
  // Fixed Assets
  { section: "asset_fixed", category: "Equipment", label: "Equipment" },
  { section: "asset_fixed", category: "Vehicles", label: "Vehicles" },
  // Current Liabilities
  { section: "liability_current", category: "Debt", label: "Credit Cards" },
  { section: "liability_current", category: "Tax", label: "Taxes Owed" },
  // Long-Term Liabilities
  { section: "liability_long", category: "Debt", label: "Business Loans" },
  { section: "liability_long", category: "Debt", label: "Equipment Financing" },
  { section: "liability_long", category: "Debt", label: "Notes Payable" },
  // Equity
  { section: "equity", category: "Equity", label: "Owner Contribution" },
  { section: "equity", category: "Equity", label: "Retained Earnings" },
];

export function makeDefaultLineItems(): LineItem[] {
  return DEFAULT_TEMPLATE.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
    amount: 0,
  }));
}

export function sumSection(items: LineItem[], section: FinanceSection): number {
  return items
    .filter((i) => i.section === section)
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
}

export interface PnL {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheet {
  currentAssets: number;
  fixedAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  longLiabilities: number;
  totalLiabilities: number;
  equity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export interface CashFlow {
  totalDeposits: number;
  totalExpenses: number;
  netCashFlow: number;
  averageMonthlyDeposits: number;
}

export function computePnL(items: LineItem[]): PnL {
  const grossRevenue = sumSection(items, "income");
  const totalExpenses = sumSection(items, "expense");
  return {
    grossRevenue,
    totalExpenses,
    netProfit: grossRevenue - totalExpenses,
  };
}

export function computeBalanceSheet(items: LineItem[]): BalanceSheet {
  const currentAssets = sumSection(items, "asset_current");
  const fixedAssets = sumSection(items, "asset_fixed");
  const totalAssets = currentAssets + fixedAssets;
  const currentLiabilities = sumSection(items, "liability_current");
  const longLiabilities = sumSection(items, "liability_long");
  const totalLiabilities = currentLiabilities + longLiabilities;
  const equity = sumSection(items, "equity");
  const totalLiabilitiesAndEquity = totalLiabilities + equity;
  return {
    currentAssets,
    fixedAssets,
    totalAssets,
    currentLiabilities,
    longLiabilities,
    totalLiabilities,
    equity,
    totalLiabilitiesAndEquity,
    balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
  };
}

export function computeCashFlow(items: LineItem[], months = 12): CashFlow {
  const totalDeposits = sumSection(items, "income");
  const totalExpenses = sumSection(items, "expense");
  return {
    totalDeposits,
    totalExpenses,
    netCashFlow: totalDeposits - totalExpenses,
    averageMonthlyDeposits: months > 0 ? totalDeposits / months : 0,
  };
}

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);