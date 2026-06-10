/**
 * Normalize a raw field option label/value to a human-friendly Title Case string.
 * Converts snake_case, kebab-case, and lowercase tokens so the first letter
 * of every word is capitalized. Known acronyms stay uppercase.
 */
const ACRONYMS = new Set([
  "FHA", "VA", "USDA", "HELOC", "DTI", "LTV", "APR", "PMI", "MIP",
  "ARM", "LLC", "SSN", "EIN", "ID", "US", "USA", "LOS", "CRM", "AI", "P&L",
]);

export function formatOptionLabel(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // Split on underscores, dashes, and whitespace; preserve internal punctuation.
  return s
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      // Keep mixed-case words (e.g. "iPhone") untouched.
      if (/[A-Z]/.test(word) && /[a-z]/.test(word)) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}