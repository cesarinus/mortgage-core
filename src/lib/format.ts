/** Format a US phone number string as (xxx) xxx-xxxx. Returns the raw input if it can't be parsed. */
export function formatPhone(input?: string | null): string {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return String(input);
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}