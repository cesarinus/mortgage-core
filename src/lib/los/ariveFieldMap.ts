/**
 * Single source of truth for the ARIVE export contract.
 * Consumed by the validator, the export preview dialog, and the
 * "Field Mapping Documentation" settings page so they never drift.
 */
export type AriveDataType =
  | "string"
  | "email"
  | "phone"
  | "money"
  | "number"
  | "fico"
  | "enum"
  | "date";

export interface AriveFieldDef {
  /** ARIVE / Zapier field key (camelCase). */
  ariveField: string;
  /** Display name for the CRM source. */
  crmField: string;
  /** Dotted accessor on the merged source `{ ...lead, ...mortgageProfile, mp: extras }`. */
  crmPath: string;
  type: AriveDataType;
  required: boolean;
  /** Default applied ONLY when CRM is empty AND ARIVE requires a value. */
  defaultValue?: string;
  /** Allowed enum values, when type === "enum". */
  enumValues?: string[];
  description?: string;
}

export const ARIVE_DEFAULTS = {
  homebuyingStage: "Just Started",
  leadSource: "Mortgage Core CRM",
  loanStatus: "Lead",
  occupancyType: "Primary Residence",
} as const;

/**
 * The flat payload contract sent to Zapier → ARIVE.
 * Order matters: it drives row order in the preview modal and the docs table.
 */
export const ARIVE_FIELD_MAP: AriveFieldDef[] = [
  { ariveField: "firstName",          crmField: "First Name",            crmPath: "first_name",                 type: "string", required: true },
  { ariveField: "lastName",           crmField: "Last Name",             crmPath: "last_name",                  type: "string", required: true },
  { ariveField: "email",              crmField: "Email",                 crmPath: "email",                      type: "email",  required: true },
  { ariveField: "mobilePhone",        crmField: "Phone",                 crmPath: "phone",                      type: "phone",  required: true },
  { ariveField: "loanPurpose",        crmField: "Loan Purpose",          crmPath: "loan_purpose",               type: "enum",   required: true, enumValues: ["Purchase", "Refinance"] },
  { ariveField: "propertyUse",        crmField: "Property Use",          crmPath: "occupancy_type",             type: "string", required: true, defaultValue: ARIVE_DEFAULTS.occupancyType },
  { ariveField: "estimatedFICO",      crmField: "Estimated Credit Score",crmPath: "credit_range",               type: "fico",   required: true },
  { ariveField: "loanAmount",         crmField: "Loan Amount",           crmPath: "__loan_amount",              type: "money",  required: false },
  { ariveField: "purchasePrice",      crmField: "Purchase Price",        crmPath: "purchase_price",             type: "money",  required: false },
  { ariveField: "estimatedValue",     crmField: "Estimated Property Value", crmPath: "property_value",          type: "money",  required: false },
  { ariveField: "leadSource",         crmField: "Lead Source",           crmPath: "source",                     type: "string", required: true, defaultValue: ARIVE_DEFAULTS.leadSource },
  { ariveField: "externalCreateDate", crmField: "Created At",            crmPath: "created_at",                 type: "date",   required: true },
  { ariveField: "loanType",           crmField: "Loan Type",             crmPath: "mp.loan_type",               type: "enum",   required: false, enumValues: ["Conventional", "FHA", "VA", "USDA", "Jumbo"] },
  { ariveField: "refinanceType",      crmField: "Refinance Type",        crmPath: "refinance_type",             type: "enum",   required: false, enumValues: ["Rate and Term", "Cash Out", "Streamline"] },
];
