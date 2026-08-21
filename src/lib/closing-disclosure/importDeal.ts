import { supabase } from "@/integrations/supabase/client";
import type { ClosingDisclosureForm } from "./types";

export interface DealImportResult {
  apply: (draft: ClosingDisclosureForm) => void;
  /** Lowercased field labels that were populated from the deal. */
  importedLabels: string[];
  sourceDealId: string | null;
  dealName: string;
}

const isoDate = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");
const nz = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const joinName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ").trim();

const LOAN_TYPE_MAP: Record<string, string> = {
  conventional: "Conventional",
  conforming: "Conventional",
  fha: "FHA",
  va: "VA",
  usda: "USDA",
};

const PURPOSE_MAP: Record<string, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  refi: "Refinance",
  "cash-out refinance": "Refinance",
  construction: "Construction",
  "home equity": "Home Equity Loan",
  heloc: "Home Equity Loan",
};

/**
 * Pull an existing pipeline opportunity (deal) plus its lead/contact and map the
 * mappable CFPB H-25A fields. Returns a mutator so the caller keeps immutable state.
 */
export async function importFromDeal(args: {
  opportunityId?: string | null;
  leadId?: string | null;
}): Promise<DealImportResult | null> {
  const { opportunityId, leadId } = args;
  if (!opportunityId && !leadId) return null;

  let opp: Record<string, unknown> | null = null;
  if (opportunityId) {
    const { data } = await supabase
      .from("pipeline_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .maybeSingle();
    opp = (data as Record<string, unknown> | null) ?? null;
  }

  const resolvedLeadId = (opp?.lead_id as string | null) ?? leadId ?? null;
  let lead: Record<string, unknown> | null = null;
  if (resolvedLeadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", resolvedLeadId).maybeSingle();
    lead = (data as Record<string, unknown> | null) ?? null;
  }

  let contact: Record<string, unknown> | null = null;
  const contactId = (opp?.primary_contact_id as string | null) ?? (opp?.contact_id as string | null);
  if (contactId) {
    const { data } = await supabase.from("contacts").select("*").eq("id", contactId).maybeSingle();
    contact = (data as Record<string, unknown> | null) ?? null;
  }

  if (!opp && !lead) return null;

  const labels: string[] = [];
  const mark = (label: string) => labels.push(label.toLowerCase());

  const borrowerName =
    joinName(contact?.first_name as string, contact?.last_name as string) ||
    (lead?.name as string) ||
    joinName(lead?.first_name as string, lead?.last_name as string);
  const borrowerAddress = (contact?.address as string) || "";
  const propertyAddress =
    ((opp?.property_address as string) || (lead?.property_address as string) || "").trim();
  const loanAmount = nz(opp?.loan_amount) ?? nz(lead?.loan_amount);
  const purchasePrice = nz(opp?.purchase_price);
  const propertyValue = nz(opp?.subject_property_value) ?? nz(lead?.property_value);
  const downPayment = nz(opp?.down_payment);
  const closingDate = isoDate(opp?.close_date as string);
  const loanId =
    (opp?.los_loan_number as string) ||
    (opp?.arive_loan_id as string) ||
    (opp?.id ? String(opp.id).slice(0, 8).toUpperCase() : "");

  const rawPurpose = String(
    (opp?.transaction_type as string) || (lead?.transaction_type as string) || (lead?.loan_purpose as string) || "",
  ).toLowerCase();
  const purpose = PURPOSE_MAP[rawPurpose] ?? (rawPurpose.includes("refi") ? "Refinance" : rawPurpose ? "Purchase" : "");
  const isRefi = purpose === "Refinance" || purpose === "Home Equity Loan";

  const rawType = String((opp?.loan_type as string) || (opp?.loan_program as string) || "").toLowerCase();
  const loanType = LOAN_TYPE_MAP[rawType] ?? (rawType ? "Other" : "");

  const apply = (f: ClosingDisclosureForm) => {
    if (borrowerName) {
      f.transactionInfo.borrower_name = borrowerName;
      mark("Borrower Name");
    }
    if (borrowerAddress) {
      f.transactionInfo.borrower_address = borrowerAddress;
      mark("Borrower Address");
    }
    if (loanId) {
      f.transactionInfo.loan_id = loanId;
      mark("Loan ID #");
    }
    if (closingDate) {
      f.closingInfo.closing_date = closingDate;
      mark("Closing Date");
      if (!f.closingInfo.disbursement_date) {
        f.closingInfo.disbursement_date = closingDate;
        mark("Disbursement Date");
      }
    }
    if (!f.closingInfo.date_issued) {
      f.closingInfo.date_issued = new Date().toISOString().slice(0, 10);
    }
    if (propertyAddress) {
      f.property.property_address = propertyAddress;
      mark("Property Address");
    }
    if (isRefi) {
      if (propertyValue) {
        f.property.estimated_property_value = propertyValue;
        mark("Estimated Property Value");
      }
    } else {
      if (purchasePrice ?? propertyValue) {
        f.property.sale_price = purchasePrice ?? propertyValue;
        mark("Sale Price");
      }
      if (propertyValue) {
        f.property.appraised_property_value = propertyValue;
        mark("Appraised Property Value");
      }
    }
    if (purpose) {
      f.loanInformation.purpose = purpose;
      mark("Purpose");
    }
    if (loanType) {
      f.loanInformation.loan_type = loanType;
      mark("Loan Type");
    }
    if (loanAmount) {
      f.loanTerms.loan_amount = loanAmount;
      mark("Loan Amount");
    }
    if (downPayment) {
      f.cashToClose.summaries.down_payment = downPayment;
      mark("Down Payment");
    }

    // Borrower contact block on page 5.
    const borrowerEmail = (contact?.email as string) || (lead?.email as string) || "";
    const borrowerPhone = (contact?.phone as string) || (lead?.phone as string) || "";
    const lender = f.contactInfo.parties.find((p) => p.role === "lender");
    if (lender && !lender.name) lender.name = f.transactionInfo.lender_name;
    void borrowerEmail;
    void borrowerPhone;
  };

  return {
    apply,
    // Same array reference the mutator fills — read it after calling apply().
    importedLabels: labels,
    sourceDealId: (opp?.id as string) ?? null,
    dealName: (opp?.name as string) || propertyAddress || borrowerName || "Deal",
  };
}
