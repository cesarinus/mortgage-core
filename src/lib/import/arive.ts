import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export type AriveKind = "borrowers" | "business";

export type RawRow = Record<string, any>;

export interface ParsedFile {
  kind: AriveKind;
  rows: RawRow[];
  headers: string[];
}

export interface ImportResult {
  contactsCreated: number;
  contactsUpdated: number;
  companiesCreated: number;
  companiesUpdated: number;
  linksCreated: number;
  rejected: { row: RawRow; reason: string; source: AriveKind }[];
}

const norm = (s?: any) => (s == null ? "" : String(s).trim());
const lower = (s?: any) => norm(s).toLowerCase();
const nonEmpty = (...vals: any[]) => vals.map(norm).find((v) => v) || "";

/** Find a column whose normalized name matches any candidate. */
function pick(row: RawRow, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const target = cand.toLowerCase().replace(/[\s_#]+/g, "");
    const hit = keys.find(
      (k) => k.toLowerCase().replace(/[\s_#]+/g, "") === target,
    );
    if (hit && norm(row[hit])) return norm(row[hit]);
  }
  return "";
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const name = file.name.toLowerCase();
  // Heuristic: business contacts have a Contact Type column; borrowers don't.
  const looksBusiness =
    headers.some((h) => /contact\s*type/i.test(h)) ||
    /business/i.test(name);
  return { kind: looksBusiness ? "business" : "borrowers", rows, headers };
}

function joinAddress(parts: string[]) {
  const cleaned = parts.map(norm).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : "";
}

function appendNoteBlock(existing: string | null | undefined, lines: string[]) {
  const block = lines.filter(Boolean).join("\n");
  if (!block) return existing ?? null;
  const header = `--- Imported from Arive ${new Date().toISOString().slice(0, 10)} ---`;
  const tail = `${header}\n${block}`;
  return existing ? `${existing}\n\n${tail}` : tail;
}

const ROLE_MAP: Record<string, string> = {
  "real estate agent": "real_estate_agent",
  "realtor": "real_estate_agent",
  "buyer's agent": "real_estate_agent",
  "buyers agent": "real_estate_agent",
  "listing agent": "real_estate_agent",
  "selling agent": "real_estate_agent",
  "title agent": "title_agent",
  "title company": "title_agent",
  "escrow": "title_agent",
  "insurance agent": "insurance_agent",
  "insurance": "insurance_agent",
  "homeowners insurance": "insurance_agent",
  "referral partner": "referral_partner",
  "referral": "referral_partner",
  "co-borrower": "co_borrower",
  "co borrower": "co_borrower",
  "borrower": "borrower",
  "lead": "lead",
};

const COMPANY_TYPE_MAP: Record<string, string> = {
  real_estate_agent: "real_estate_brokerage",
  title_agent: "title_company",
  insurance_agent: "insurance_agency",
  referral_partner: "other",
  borrower: "other",
  co_borrower: "other",
  lead: "other",
};

function mapRole(contactType: string): string {
  const k = lower(contactType);
  return ROLE_MAP[k] || "referral_partner";
}

function mapBorrowerRow(row: RawRow) {
  const first = pick(row, ["First Name", "FirstName"]);
  const last = pick(row, ["Last Name", "LastName"]);
  const middle = pick(row, ["Middle Name", "MiddleName"]);
  const email = pick(row, ["Email", "Primary Email", "Email Address"]);
  const cell = pick(row, ["Cell Phone", "Mobile", "Mobile Phone"]);
  const home = pick(row, ["Home Phone"]);
  const work = pick(row, ["Work Phone", "Office Phone"]);
  const phone = nonEmpty(cell, home, work);
  const dobRaw = pick(row, ["Date of Birth", "DOB", "Birth Date"]);
  const dob = parseDate(dobRaw);
  const address = joinAddress([
    pick(row, ["Street", "Street Address", "Address"]),
    pick(row, ["Unit", "Unit #", "Unit Number", "Apt"]),
    pick(row, ["City"]),
    `${pick(row, ["State"])} ${pick(row, ["Zip", "Zip Code", "Postal Code"])}`.trim(),
    pick(row, ["County"]),
  ]);
  const license = pick(row, ["License #", "License Number", "License"]);

  const noteLines: string[] = [];
  if (home && phone !== home) noteLines.push(`Phone (home): ${home}`);
  if (work && phone !== work) noteLines.push(`Phone (work): ${work}`);
  const sec = pick(row, ["Secondary Email", "Alt Email"]);
  if (sec) noteLines.push(`Secondary email: ${sec}`);
  const fax = pick(row, ["Fax"]);
  if (fax) noteLines.push(`Fax: ${fax}`);
  const marital = pick(row, ["Marital Status"]);
  if (marital) noteLines.push(`Marital status: ${marital}`);
  const suffix = pick(row, ["Suffix"]);
  if (suffix) noteLines.push(`Suffix: ${suffix}`);

  return {
    first_name: first,
    last_name: last,
    middle_name: middle || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    dob: dob || null,
    license_number: license || null,
    contact_type: "borrower" as const,
    role: "borrower" as const,
    notesLines: noteLines,
  };
}

function parseDate(s: string): string | null {
  if (!s) return null;
  // Excel may give a Date or a string. xlsx with defval keeps as raw value.
  if (s instanceof Date) return s.toISOString().slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function mapBusinessRow(row: RawRow) {
  const first = pick(row, ["First Name", "FirstName"]);
  const last = pick(row, ["Last Name", "LastName"]);
  const email = pick(row, ["Email", "Primary Email", "Email Address"]);
  const phone = nonEmpty(
    pick(row, ["Cell Phone", "Mobile"]),
    pick(row, ["Phone"]),
    pick(row, ["Work Phone", "Office Phone"]),
  );
  const license = pick(row, ["License #", "License Number", "License", "NMLS"]);
  const contactType = pick(row, ["Contact Type", "Type"]);
  const role = mapRole(contactType);
  const address = joinAddress([
    pick(row, ["Street", "Address", "Street Address"]),
    pick(row, ["Unit", "Unit #"]),
    pick(row, ["City"]),
    `${pick(row, ["State"])} ${pick(row, ["Zip", "Zip Code"])}`.trim(),
  ]);

  const personNotes: string[] = [];
  const sec = pick(row, ["Secondary Email", "Alt Email"]);
  if (sec) personNotes.push(`Secondary email: ${sec}`);
  const fax = pick(row, ["Fax"]);
  if (fax) personNotes.push(`Fax: ${fax}`);
  const suffix = pick(row, ["Suffix"]);
  if (suffix) personNotes.push(`Suffix: ${suffix}`);
  const stateCode = pick(row, ["State Code", "License State"]);
  if (stateCode) personNotes.push(`License state: ${stateCode}`);
  if (contactType) personNotes.push(`Arive contact type: ${contactType}`);

  // Company side
  const companyName = pick(row, [
    "Company Name",
    "Company",
    "Business Name",
    "Organization",
  ]);
  const companyPhone = pick(row, ["Company Phone", "Business Phone"]);
  const companyAddress = joinAddress([
    pick(row, ["Company Street", "Company Address", "Business Address"]),
    pick(row, ["Company Unit"]),
    pick(row, ["Company City"]),
    `${pick(row, ["Company State"])} ${pick(row, ["Company Zip"])}`.trim(),
  ]);
  const companyLicense = pick(row, [
    "Company License",
    "Company License #",
    "Company NMLS",
  ]);
  const companyEmail = pick(row, ["Company Email", "Business Email"]);
  const companyFax = pick(row, ["Company Fax"]);
  const affiliateType = pick(row, ["Affiliate Type"]);
  const companyNotes: string[] = [];
  if (companyEmail) companyNotes.push(`Email: ${companyEmail}`);
  if (companyFax) companyNotes.push(`Fax: ${companyFax}`);
  if (affiliateType) companyNotes.push(`Affiliate type: ${affiliateType}`);

  return {
    person: {
      first_name: first,
      last_name: last,
      email: email || null,
      phone: phone || null,
      address: address || null,
      license_number: license || null,
      contact_type: "partner" as const,
      role,
      notesLines: personNotes,
    },
    company: companyName
      ? {
          name: companyName,
          phone: companyPhone || null,
          address: companyAddress || null,
          license_number: companyLicense || null,
          company_type: COMPANY_TYPE_MAP[role] || "other",
          notesLines: companyNotes,
        }
      : null,
    contact_role: role,
  };
}

export interface DryRunSummary {
  borrowers: {
    create: number;
    update: number;
    rejected: { row: RawRow; reason: string }[];
  };
  business: {
    createContact: number;
    updateContact: number;
    createCompany: number;
    updateCompany: number;
    rejected: { row: RawRow; reason: string }[];
  };
}

async function fetchContactByEmail(email: string) {
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  return data as any;
}

async function fetchCompanyByName(name: string) {
  const { data } = await supabase
    .from("crm_companies")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  return data as any;
}

/** Fill empty target fields with source values; never overwrite non-empty. */
function mergeFillEmpty<T extends Record<string, any>>(
  existing: T,
  patch: Partial<T>,
): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") continue;
    if (existing[k] == null || existing[k] === "") out[k] = v;
  }
  return out;
}

export async function runImport(
  files: ParsedFile[],
  userId: string,
  opts: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    contactsCreated: 0,
    contactsUpdated: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    linksCreated: 0,
    rejected: [],
  };
  const dry = !!opts.dryRun;

  for (const file of files) {
    if (file.kind === "borrowers") {
      for (const row of file.rows) {
        const m = mapBorrowerRow(row);
        if (!m.first_name || !m.last_name) {
          result.rejected.push({
            row,
            reason: "Missing first or last name",
            source: "borrowers",
          });
          continue;
        }
        const existing = m.email
          ? await fetchContactByEmail(m.email)
          : null;
        const notes = appendNoteBlock(existing?.notes ?? null, m.notesLines);
        const base: any = {
          first_name: m.first_name,
          last_name: m.last_name,
          middle_name: m.middle_name,
          email: m.email,
          phone: m.phone,
          address: m.address,
          dob: m.dob,
          license_number: m.license_number,
          contact_type: m.contact_type,
          role: m.role,
        };
        if (existing) {
          const patch = mergeFillEmpty(existing, base);
          (patch as any).notes = notes;
          if (!dry) {
            await supabase.from("contacts").update(patch).eq("id", existing.id);
          }
          result.contactsUpdated++;
        } else {
          const payload = { ...base, notes, created_by: userId };
          if (!dry) {
            await supabase.from("contacts").insert(payload as any);
          }
          result.contactsCreated++;
        }
      }
    } else {
      for (const row of file.rows) {
        const m = mapBusinessRow(row);
        const p = m.person;
        if (!p.first_name || !p.last_name) {
          result.rejected.push({
            row,
            reason: "Missing first or last name",
            source: "business",
          });
          continue;
        }

        // Company first (so we can link)
        let companyId: string | null = null;
        if (m.company) {
          const existingCo = await fetchCompanyByName(m.company.name);
          const coNotes = appendNoteBlock(
            existingCo?.notes ?? null,
            m.company.notesLines,
          );
          const coBase: any = {
            name: m.company.name,
            phone: m.company.phone,
            address: m.company.address,
            license_number: m.company.license_number,
            company_type: m.company.company_type,
          };
          if (existingCo) {
            companyId = existingCo.id;
            const patch = mergeFillEmpty(existingCo, coBase);
            (patch as any).notes = coNotes;
            if (Object.keys(patch).length > 0 && !dry) {
              await supabase
                .from("crm_companies")
                .update(patch)
                .eq("id", existingCo.id);
            }
            result.companiesUpdated++;
          } else if (!dry) {
            const { data: ins } = await supabase
              .from("crm_companies")
              .insert({ ...coBase, notes: coNotes, created_by: userId } as any)
              .select("id")
              .maybeSingle();
            companyId = ins?.id ?? null;
            result.companiesCreated++;
          } else {
            result.companiesCreated++;
          }
        }

        // Contact
        const existing = p.email ? await fetchContactByEmail(p.email) : null;
        const notes = appendNoteBlock(existing?.notes ?? null, p.notesLines);
        const base: any = {
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone: p.phone,
          address: p.address,
          license_number: p.license_number,
          contact_type: p.contact_type,
          role: p.role,
          company_id: companyId,
        };
        let contactId: string | null = null;
        if (existing) {
          contactId = existing.id;
          const patch = mergeFillEmpty(existing, base);
          (patch as any).notes = notes;
          if (!dry) {
            await supabase.from("contacts").update(patch).eq("id", existing.id);
          }
          result.contactsUpdated++;
        } else if (!dry) {
          const { data: ins } = await supabase
            .from("contacts")
            .insert({ ...base, notes, created_by: userId } as any)
            .select("id")
            .maybeSingle();
          contactId = ins?.id ?? null;
          result.contactsCreated++;
        } else {
          result.contactsCreated++;
        }

        // Link
        if (companyId && contactId && !dry) {
          const { data: link } = await supabase
            .from("crm_contact_companies")
            .select("id")
            .eq("contact_id", contactId)
            .eq("company_id", companyId)
            .maybeSingle();
          if (!link) {
            await supabase.from("crm_contact_companies").insert({
              contact_id: contactId,
              company_id: companyId,
              contact_role: m.contact_role,
            } as any);
            result.linksCreated++;
          }
        }
      }
    }
  }

  return result;
}

export function rejectsToCsv(rejected: ImportResult["rejected"]): string {
  if (!rejected.length) return "";
  const allKeys = new Set<string>(["__source", "__reason"]);
  rejected.forEach((r) => Object.keys(r.row).forEach((k) => allKeys.add(k)));
  const headers = Array.from(allKeys);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  rejected.forEach((r) => {
    const obj: any = { __source: r.source, __reason: r.reason, ...r.row };
    lines.push(headers.map((h) => esc(obj[h])).join(","));
  });
  return lines.join("\n");
}