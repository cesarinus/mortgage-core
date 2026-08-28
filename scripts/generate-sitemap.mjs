import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://ngcapital.net";
const SUPABASE_URL = "https://hyskofjwotohgdtocsie.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2tvZmp3b3RvaGdkdG9jc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjcxODUsImV4cCI6MjA4NjA0MzE4NX0.2M5GNKjxatuYJ2cG3kwHjcrwdK8CTRXwPerdv__J8vQ";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/book", changefreq: "monthly", priority: "0.7" },
];

async function fetchBlogSlugs(): Promise<Entry[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,updated_at,created_at&status=eq.published`,
      {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ slug: string; updated_at?: string; created_at?: string }>;
    return rows.map((r) => ({
      path: `/blog/${r.slug}`,
      lastmod: (r.updated_at || r.created_at || "").slice(0, 10) || undefined,
      changefreq: "weekly",
      priority: "0.6",
    }));
  } catch {
    return [];
  }
}

function buildXml(entries: Entry[]): string {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const dynamic = await fetchBlogSlugs();
  const xml = buildXml([...staticEntries, ...dynamic]);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${staticEntries.length + dynamic.length} entries)`);
})();