/**
 * CFPB Closing Disclosure (Model Form H-25A) — 6 page structure.
 * Field names mirror the regulatory labels where practical.
 */

export type Direction = "From Borrower" | "To Borrower";
export type SellerDirection = "From Seller" | "To Seller";

export interface EscrowedPropertyCost {
  type: string;
  amount: number | null;
  in_escrow: boolean;
  can_increase_after_closing: boolean;
}
export interface NonEscrowedPropertyCost {
  type: string;
  amount: number | null;
}
export interface OriginationCharge {
  item: string;
  percent_of_loan: number | null;
  amount: number | null;
}
export interface ServiceLine {
  item: string;
  borrower_paid_at_closing: number | null;
  borrower_paid_before: number | null;
  seller_paid: number | null;
  others_paid: number | null;
}
export interface OtherCostLine {
  item: string;
  borrower_paid_at_closing: number | null;
  seller_paid: number | null;
  others_paid: number | null;
}
export interface InitialEscrowLine {
  type: string;
  per_month: number | null;
  months: number | null;
  amount: number | null;
}
export interface AmountLine {
  item: string;
  amount: number | null;
}
export interface ComparisonLine {
  item: string;
  loan_estimate: number | null;
  final: number | null;
  did_change: boolean;
}
export interface ContactParty {
  role: string;
  name: string;
  address: string;
  nmls_id: string;
  license_id: string;
  contact_name: string;
  contact_nmls_id: string;
  contact_license_id: string;
  email: string;
  phone: string;
}

export interface ClosingDisclosureForm {
  /* ---------- PAGE 1 ---------- */
  transactionInfo: {
    borrower_name: string;
    borrower_address: string;
    seller_name: string;
    seller_address: string;
    lender_name: string;
    lender_address: string;
    loan_id: string;
    mic_number: string;
  };
  closingInfo: {
    date_issued: string;
    closing_date: string;
    disbursement_date: string;
    settlement_agent: string;
    file_number: string;
  };
  property: {
    property_address: string;
    sale_price: number | null;
    appraised_property_value: number | null;
    estimated_property_value: number | null;
  };
  loanInformation: {
    loan_term: string;
    purpose: string;
    product: string;
    loan_type: string;
  };
  loanTerms: {
    loan_amount: number | null;
    interest_rate: number | null;
    monthly_principal_interest: number | null;
    estimated_total_monthly_payment: number | null;
    has_prepayment_penalty: boolean;
    prepayment_penalty_details: string;
    has_balloon_payment: boolean;
    balloon_payment_details: string;
    loan_amount_can_increase: boolean;
    interest_rate_can_increase: boolean;
    payment_can_increase: boolean;
  };
  closingCostsSummary: {
    total_loan_costs: number | null;
    other_costs: number | null;
    lender_credits: number | null;
    total_closing_costs: number | null;
    cash_to_close_amount: number | null;
  };
  projectedPayments: {
    principal_interest: number | null;
    mortgage_insurance: number | null;
    estimated_escrow: number | null;
    estimated_taxes_insurance_assessments: number | null;
    escrowed_property_costs: EscrowedPropertyCost[];
    non_escrowed_property_costs: NonEscrowedPropertyCost[];
  };

  /* ---------- PAGE 2 ---------- */
  loanCosts: {
    origination_charges: OriginationCharge[];
    services_not_shopped: ServiceLine[];
    services_shopped: ServiceLine[];
    total_loan_costs: number | null;
    loan_costs_subtotals: {
      section_a: number | null;
      section_b: number | null;
      section_c: number | null;
      borrower_paid_before: number | null;
      seller_paid: number | null;
      others_paid: number | null;
    };
  };
  otherCosts: {
    recording_fees_deed: number | null;
    recording_fees_mortgage: number | null;
    other_government_fees: OtherCostLine[];
    prepaids: {
      homeowners_insurance_premium: number | null;
      homeowners_insurance_months: number | null;
      mortgage_insurance_premium_months: number | null;
      mortgage_insurance_premium: number | null;
      prepaid_interest_per_day: number | null;
      prepaid_interest_dates: string;
      prepaid_interest_amount: number | null;
      property_taxes_months: number | null;
      property_taxes_amount: number | null;
      other_prepaids: OtherCostLine[];
    };
    initial_escrow: InitialEscrowLine[];
    aggregate_adjustment: number | null;
    other_costs_detail: OtherCostLine[];
    total_other_costs: number | null;
    lender_credits_amount: number | null;
    total_closing_costs: number | null;
  };

  /* ---------- PAGE 3 ---------- */
  cashToClose: {
    due_from_borrower: AmountLine[];
    paid_already_by_borrower: AmountLine[];
    total_due_from_borrower: number | null;
    total_paid_already_by_borrower: number | null;
    cash_to_close_borrower: number | null;
    direction_to_borrower: Direction;
    due_to_seller: AmountLine[];
    due_from_seller: AmountLine[];
    total_due_to_seller: number | null;
    total_due_from_seller: number | null;
    cash_to_close_seller: number | null;
    direction_to_seller: SellerDirection;
    summaries: {
      total_closing_costs: number | null;
      closing_costs_paid_before: number | null;
      closing_costs_financed: number | null;
      down_payment: number | null;
      deposit: number | null;
      funds_for_borrower: number | null;
      seller_credits: number | null;
      adjustments_and_other_credits: number | null;
      cash_to_close: number | null;
    };
    loan_estimate_comparison: ComparisonLine[];
  };

  /* ---------- PAGE 4 ---------- */
  loanDisclosures: {
    assumption_allowed: boolean;
    assumption_conditions: string;
    has_demand_feature: boolean;
    demand_feature_details: string;
    late_payment_days: number | null;
    late_payment_fee_amount: number | null;
    negative_amortization_type: "scheduled" | "may" | "none";
    negative_amortization_details: string;
    partial_payments_policy: "accept" | "hold" | "does_not_accept";
    security_interest_description: string;
    escrow: {
      will_have_escrow_account: boolean;
      escrow_waiver_reason: "declined" | "not_offered" | null;
      escrowed_property_costs_year1: number | null;
      non_escrowed_property_costs_year1: number | null;
      initial_escrow_payment: number | null;
      monthly_escrow_payment: number | null;
      no_escrow_estimated_property_costs_year1: number | null;
      escrow_waiver_fee: number | null;
      escrow_notes: string;
    };
    adjustable_payment: {
      interest_only_payments: boolean;
      optional_payments: boolean;
      step_payments: boolean;
      seasonal_payments: boolean;
      monthly_principal_interest_changes: {
        first_change_amount: string;
        subsequent_changes_amount: string;
        maximum_payment: string;
      };
    };
    adjustable_interest_rate: {
      index_margin: string;
      initial_interest_rate: number | null;
      min_interest_rate: number | null;
      max_interest_rate: number | null;
      change_frequency: string;
      first_change: string;
      subsequent_changes: string;
      limits_on_interest_rate_changes: {
        first_change: string;
        subsequent_changes: string;
      };
    };
  };

  /* ---------- PAGE 5 ---------- */
  contactInfo: {
    parties: ContactParty[];
  };
  otherDisclosures: {
    appraisal_acknowledged: boolean;
    contract_details_acknowledged: boolean;
    liability_after_foreclosure_protected: boolean;
    refinance_possible: boolean;
    tax_deductions_note: string;
  };
  signatures: {
    applicant_signature_data_url: string;
    applicant_signature_date: string;
    co_applicant_signature_data_url: string;
    co_applicant_signature_date: string;
    receipt_confirmed: boolean;
  };

  /* ---------- PAGE 6 ---------- */
  loanCalculations: {
    total_of_payments: number | null;
    finance_charge: number | null;
    amount_financed: number | null;
    apr: number | null;
    tip: number | null;
  };
  closingDetails: {
    settlement_notes: string;
    document_ids: string;
  };
}

export const CONTACT_ROLES = [
  "lender",
  "mortgage_broker",
  "real_estate_broker_buyer",
  "real_estate_broker_seller",
  "settlement_agent",
] as const;

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  lender: "Lender",
  mortgage_broker: "Mortgage Broker",
  real_estate_broker_buyer: "Real Estate Broker (B)",
  real_estate_broker_seller: "Real Estate Broker (S)",
  settlement_agent: "Settlement Agent",
};

export const emptyParty = (role = ""): ContactParty => ({
  role,
  name: "",
  address: "",
  nmls_id: "",
  license_id: "",
  contact_name: "",
  contact_nmls_id: "",
  contact_license_id: "",
  email: "",
  phone: "",
});

export const emptyServiceLine = (): ServiceLine => ({
  item: "",
  borrower_paid_at_closing: null,
  borrower_paid_before: null,
  seller_paid: null,
  others_paid: null,
});

export const emptyOtherCostLine = (): OtherCostLine => ({
  item: "",
  borrower_paid_at_closing: null,
  seller_paid: null,
  others_paid: null,
});

export function createEmptyForm(): ClosingDisclosureForm {
  return {
    transactionInfo: {
      borrower_name: "",
      borrower_address: "",
      seller_name: "",
      seller_address: "",
      lender_name: "",
      lender_address: "",
      loan_id: "",
      mic_number: "",
    },
    closingInfo: {
      date_issued: "",
      closing_date: "",
      disbursement_date: "",
      settlement_agent: "",
      file_number: "",
    },
    property: {
      property_address: "",
      sale_price: null,
      appraised_property_value: null,
      estimated_property_value: null,
    },
    loanInformation: {
      loan_term: "30 years",
      purpose: "Purchase",
      product: "Fixed Rate",
      loan_type: "Conventional",
    },
    loanTerms: {
      loan_amount: null,
      interest_rate: null,
      monthly_principal_interest: null,
      estimated_total_monthly_payment: null,
      has_prepayment_penalty: false,
      prepayment_penalty_details: "",
      has_balloon_payment: false,
      balloon_payment_details: "",
      loan_amount_can_increase: false,
      interest_rate_can_increase: false,
      payment_can_increase: false,
    },
    closingCostsSummary: {
      total_loan_costs: null,
      other_costs: null,
      lender_credits: null,
      total_closing_costs: null,
      cash_to_close_amount: null,
    },
    projectedPayments: {
      principal_interest: null,
      mortgage_insurance: null,
      estimated_escrow: null,
      estimated_taxes_insurance_assessments: null,
      escrowed_property_costs: [
        { type: "Property Taxes", amount: null, in_escrow: true, can_increase_after_closing: true },
        { type: "Homeowner's Insurance", amount: null, in_escrow: true, can_increase_after_closing: true },
      ],
      non_escrowed_property_costs: [],
    },
    loanCosts: {
      origination_charges: [{ item: "", percent_of_loan: null, amount: null }],
      services_not_shopped: [emptyServiceLine()],
      services_shopped: [emptyServiceLine()],
      total_loan_costs: null,
      loan_costs_subtotals: {
        section_a: null,
        section_b: null,
        section_c: null,
        borrower_paid_before: null,
        seller_paid: null,
        others_paid: null,
      },
    },
    otherCosts: {
      recording_fees_deed: null,
      recording_fees_mortgage: null,
      other_government_fees: [],
      prepaids: {
        homeowners_insurance_premium: null,
        homeowners_insurance_months: null,
        mortgage_insurance_premium_months: null,
        mortgage_insurance_premium: null,
        prepaid_interest_per_day: null,
        prepaid_interest_dates: "",
        prepaid_interest_amount: null,
        property_taxes_months: null,
        property_taxes_amount: null,
        other_prepaids: [],
      },
      initial_escrow: [
        { type: "Homeowner's Insurance", per_month: null, months: null, amount: null },
        { type: "Property Taxes", per_month: null, months: null, amount: null },
      ],
      aggregate_adjustment: null,
      other_costs_detail: [],
      total_other_costs: null,
      lender_credits_amount: null,
      total_closing_costs: null,
    },
    cashToClose: {
      due_from_borrower: [],
      paid_already_by_borrower: [],
      total_due_from_borrower: null,
      total_paid_already_by_borrower: null,
      cash_to_close_borrower: null,
      direction_to_borrower: "From Borrower",
      due_to_seller: [],
      due_from_seller: [],
      total_due_to_seller: null,
      total_due_from_seller: null,
      cash_to_close_seller: null,
      direction_to_seller: "To Seller",
      summaries: {
        total_closing_costs: null,
        closing_costs_paid_before: null,
        closing_costs_financed: null,
        down_payment: null,
        deposit: null,
        funds_for_borrower: null,
        seller_credits: null,
        adjustments_and_other_credits: null,
        cash_to_close: null,
      },
      loan_estimate_comparison: [
        { item: "Total Closing Costs (J)", loan_estimate: null, final: null, did_change: false },
        { item: "Closing Costs Paid Before Closing", loan_estimate: null, final: null, did_change: false },
        { item: "Closing Costs Financed", loan_estimate: null, final: null, did_change: false },
        { item: "Down Payment/Funds from Borrower", loan_estimate: null, final: null, did_change: false },
        { item: "Deposit", loan_estimate: null, final: null, did_change: false },
        { item: "Funds for Borrower", loan_estimate: null, final: null, did_change: false },
        { item: "Seller Credits", loan_estimate: null, final: null, did_change: false },
        { item: "Adjustments and Other Credits", loan_estimate: null, final: null, did_change: false },
        { item: "Cash to Close", loan_estimate: null, final: null, did_change: false },
      ],
    },
    loanDisclosures: {
      assumption_allowed: false,
      assumption_conditions: "",
      has_demand_feature: false,
      demand_feature_details: "",
      late_payment_days: 15,
      late_payment_fee_amount: null,
      negative_amortization_type: "none",
      negative_amortization_details: "",
      partial_payments_policy: "accept",
      security_interest_description: "",
      escrow: {
        will_have_escrow_account: true,
        escrow_waiver_reason: null,
        escrowed_property_costs_year1: null,
        non_escrowed_property_costs_year1: null,
        initial_escrow_payment: null,
        monthly_escrow_payment: null,
        no_escrow_estimated_property_costs_year1: null,
        escrow_waiver_fee: null,
        escrow_notes: "",
      },
      adjustable_payment: {
        interest_only_payments: false,
        optional_payments: false,
        step_payments: false,
        seasonal_payments: false,
        monthly_principal_interest_changes: {
          first_change_amount: "",
          subsequent_changes_amount: "",
          maximum_payment: "",
        },
      },
      adjustable_interest_rate: {
        index_margin: "",
        initial_interest_rate: null,
        min_interest_rate: null,
        max_interest_rate: null,
        change_frequency: "",
        first_change: "",
        subsequent_changes: "",
        limits_on_interest_rate_changes: { first_change: "", subsequent_changes: "" },
      },
    },
    contactInfo: {
      parties: CONTACT_ROLES.map((r) => emptyParty(r)),
    },
    otherDisclosures: {
      appraisal_acknowledged: false,
      contract_details_acknowledged: false,
      liability_after_foreclosure_protected: false,
      refinance_possible: false,
      tax_deductions_note: "",
    },
    signatures: {
      applicant_signature_data_url: "",
      applicant_signature_date: "",
      co_applicant_signature_data_url: "",
      co_applicant_signature_date: "",
      receipt_confirmed: false,
    },
    loanCalculations: {
      total_of_payments: null,
      finance_charge: null,
      amount_financed: null,
      apr: null,
      tip: null,
    },
    closingDetails: {
      settlement_notes: "",
      document_ids: "",
    },
  };
}
