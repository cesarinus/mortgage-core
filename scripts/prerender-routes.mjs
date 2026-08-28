import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Pre-render static HTML shells for key SPA routes so search engines
 * see route-specific <title>, meta description, canonical, and og:* tags
 * in the raw HTML (not just after JS hydration).
 *
 * Fixes Google Search Console "Discovered - currently not indexed"
 * for /blog and /book by removing duplicate-shell signals.
 */

const DIST = resolve("dist");
const SOURCE = resolve(DIST, "index.html");

if (!existsSync(SOURCE)) {
  console.warn("[prerender] dist/index.html missing — skipping");
  process.exit(0);
}

const template = readFileSync(SOURCE, "utf8");

interface Route {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
}

const BASE = "https://ngcapital.net";

const routes: Route[] = [
  {
    path: "/blog",
    title: "Mortgage Blog | NexGen Capital — Southwest Florida Insights",
    description:
      "Expert mortgage insights, rate updates, and homebuying guides for Southwest Florida. FHA, VA, DSCR, refinance, and first-time buyer tips from NexGen Capital.",
    ogTitle: "Mortgage Blog | NexGen Capital",
    ogDescription:
      "Expert mortgage insights, rate updates, and homebuying guides for Southwest Florida.",
  },
  {
    path: "/book",
    title: "Book a Meeting | NexGen Capital — Southwest Florida Mortgage",
    description:
      "Schedule a free mortgage consultation with NexGen Capital. Get pre-approved, review loan options, or lock a rate with a Southwest Florida mortgage expert.",
    ogTitle: "Book a Mortgage Consultation | NexGen Capital",
    ogDescription:
      "Schedule a free consultation with a Southwest Florida mortgage expert.",
  },
];

function rewrite(html: string, r: Route): string {
  const canonical = `${BASE}${r.path}`;
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${r.title}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${r.description}" />`,
    )
    .replace(
      /<meta\s+property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${r.ogTitle ?? r.title}" />`,
    )
    .replace(
      /<meta\s+property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${r.ogDescription ?? r.description}" />`,
    )
    .replace(
      /<meta\s+property="og:url"[^>]*>/i,
      `<meta property="og:url" content="${canonical}" />`,
    )
    .replace(
      /<link\s+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonical}" />`,
    );
}

for (const r of routes) {
  const dir = resolve(DIST, r.path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), rewrite(template, r));
  console.log(`[prerender] wrote ${r.path}/index.html`);
}
