// Cross-site visitor ID. nexgen-capital.com passes ?vid=<id> when linking here,
// so the intake form can attach that visitor's browsing history to the new lead.
const KEY = "ng_visitor_id";
const VALID = /^[A-Za-z0-9_-]{8,64}$/;

export function captureVisitorIdFromUrl() {
  try {
    const vid = new URLSearchParams(window.location.search).get("vid");
    if (vid && VALID.test(vid)) localStorage.setItem(KEY, vid);
  } catch { /* ignore */ }
}

export function getVisitorId(): string | undefined {
  try {
    const v = localStorage.getItem(KEY);
    return v && VALID.test(v) ? v : undefined;
  } catch { return undefined; }
}
