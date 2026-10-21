import * as XLSX from "xlsx";

export type PeopleField =
  | "first_name" | "last_name" | "full_name" | "email" | "phone" | "address"
  | "job_title" | "license_number" | "company" | "notes" | "skip";

export const PEOPLE_FIELDS: { key: PeopleField; label: string }[] = [
  { key: "skip", label: "— Don't import —" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "full_name", label: "Full name (split)" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "job_title", label: "Job title" },
  { key: "license_number", label: "License #" },
  { key: "company", label: "Company / Brokerage" },
  { key: "notes", label: "Notes" },
];

const ALIASES: [PeopleField, RegExp][] = [
  ["email", /e-?mail/],
  ["first_name", /^(first|fname|given)/],
  ["last_name", /^(last|lname|surname|family)/],
  ["full_name", /^(full ?name|name|agent( name)?|contact( name)?)$/],
  ["phone", /(phone|mobile|cell|tel)/],
  ["license_number", /(licen[cs]e|lic ?#|lic no)/],
  ["company", /(company|brokerage|broker|office|firm|agency)/],
  ["job_title", /(title|position)/],
  ["address", /(address|street|city|location)/],
  ["notes", /(note|comment)/],
];

export function guessField(header: string): PeopleField {
  const h = header.trim().toLowerCase();
  for (const [f, re] of ALIASES) if (re.test(h)) return f;
  return "skip";
}

export async function parseSheet(file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export type MappedPerson = {
  first_name: string; last_name: string; email: string | null; phone: string | null;
  address: string | null; job_title: string | null; license_number: string | null;
  company: string | null; notes: string | null;
};

const clean = (v: any) => { const s = String(v ?? "").trim(); return s || null; };

export function mapRow(row: Record<string, any>, mapping: Record<string, PeopleField>): MappedPerson {
  const out: any = {};
  const addr: string[] = [];
  for (const [h, f] of Object.entries(mapping)) {
    const v = clean(row[h]);
    if (!v || f === "skip") continue;
    if (f === "address") addr.push(v);
    else if (!out[f]) out[f] = v;
  }
  if (out.full_name && (!out.first_name || !out.last_name)) {
    const parts = String(out.full_name).split(/\s+/);
    out.first_name ??= parts[0];
    out.last_name ??= parts.slice(1).join(" ");
  }
  return {
    first_name: out.first_name ?? "", last_name: out.last_name ?? "",
    email: out.email ? String(out.email).toLowerCase() : null,
    phone: out.phone ?? null, address: addr.length ? addr.join(", ") : null,
    job_title: out.job_title ?? null, license_number: out.license_number ?? null,
    company: out.company ?? null, notes: out.notes ?? null,
  };
}

export const digits = (p: string | null) => (p ?? "").replace(/\D/g, "").slice(-10) || null;
