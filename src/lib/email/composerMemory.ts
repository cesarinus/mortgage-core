// Lightweight learning store for the Smart Email Composer.
// Persists per-recipient subject/body history in localStorage so the
// composer surfaces smarter suggestions over time. No PII leaves the device.

const KEY = "smartEmailComposer.v1";
const MAX_PER_RECIPIENT = 8;
const MAX_GLOBAL = 20;

export interface ComposerEntry {
  subject: string;
  body: string;
  at: number;
  uses: number;
}

interface Store {
  byRecipient: Record<string, ComposerEntry[]>;
  global: ComposerEntry[];
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { byRecipient: {}, global: [] };
    const parsed = JSON.parse(raw);
    return {
      byRecipient: parsed.byRecipient ?? {},
      global: parsed.global ?? [],
    };
  } catch {
    return { byRecipient: {}, global: [] };
  }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota - ignore */
  }
}

const key = (email: string) => email.trim().toLowerCase();

export function suggestionsFor(email: string): {
  recipient: ComposerEntry[];
  global: ComposerEntry[];
} {
  const s = read();
  return {
    recipient: s.byRecipient[key(email)] ?? [],
    global: s.global,
  };
}

export function recordSend(email: string, subject: string, body: string) {
  if (!subject.trim()) return;
  const s = read();
  const k = key(email);
  const merge = (arr: ComposerEntry[], max: number): ComposerEntry[] => {
    const idx = arr.findIndex(
      (e) => e.subject.trim().toLowerCase() === subject.trim().toLowerCase(),
    );
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], body, at: Date.now(), uses: arr[idx].uses + 1 };
    } else {
      arr.unshift({ subject, body, at: Date.now(), uses: 1 });
    }
    return arr
      .sort((a, b) => b.uses - a.uses || b.at - a.at)
      .slice(0, max);
  };
  s.byRecipient[k] = merge(s.byRecipient[k] ?? [], MAX_PER_RECIPIENT);
  s.global = merge(s.global, MAX_GLOBAL);
  write(s);
}