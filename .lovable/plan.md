

# Add Joomla-Level SEO Metadata + 25 Mortgage Keywords

## Summary
Add comprehensive SEO metadata (meta keywords, robots directives, canonical URLs, Open Graph tags) to every page and blog article — matching Joomla CMS capabilities. Also research and embed the 25 most important mortgage/lending keywords site-wide.

## Step 1: Research 25 Core Mortgage Keywords
Use AI to identify the 25 highest-value SEO keywords for a Southwest Florida mortgage lender. These will be used as the site-level meta keywords and inform per-page keyword assignments.

Expected output (examples): "mortgage rates", "FHA loan", "VA loan", "home refinance", "first-time homebuyer", "mortgage pre-approval", "Southwest Florida mortgage", "conventional loan", "closing costs", "down payment assistance", "USDA loan", "jumbo loan", "mortgage calculator", "home equity loan", "cash-out refinance", "interest rate lock", "mortgage broker near me", "home loan application", "debt-to-income ratio", "credit score mortgage", "ARM vs fixed rate", "loan estimate", "Cape Coral mortgage", "Fort Myers home loan", "Naples mortgage lender"

## Step 2: Site-Level Meta Tags in `index.html`
Add to `<head>`:
- `<meta name="keywords" content="[25 keywords comma-separated]">`
- `<meta name="robots" content="index, follow">`
- `<meta name="content-rights" content="© 2025 NexGen Capital">`
- Improve existing OG tags (add `og:url`, `og:site_name`, `og:image`)

## Step 3: Per-Page SEO with `react-helmet-async`
Add `<Helmet>` blocks to pages that currently lack them:

- **LandingPage.tsx** — Title, description, keywords (homepage-focused subset), canonical `/`, robots
- **BlogIndex.tsx** — Title "Mortgage Blog | NexGen Capital", description, keywords (blog-focused subset), canonical `/blog`
- **Auth.tsx** — Title, `noindex, nofollow` robots (login page should not be indexed)
- **NotFound.tsx** — `noindex` robots

## Step 4: Blog Article Meta Keywords
In **BlogPost.tsx**, add to the existing `<Helmet>`:
- `<meta name="keywords" content={post.keywords.join(", ")}>`
- `<meta name="robots" content="index, follow">`
- `<meta property="og:title">`, `og:description`, `og:image`, `og:url`, `og:type=article`
- `<meta name="twitter:title">`, `twitter:description`, `twitter:image`
- `<meta property="article:published_time">`
- `<meta property="article:author">`

## Step 5: Update `robots.txt`
Add a Sitemap directive:
```text
Sitemap: https://ngcapital.net/sitemap.xml
```

## Step 6: Create SEO Constants File
Create `src/lib/seoConstants.ts` to centralize:
- Site name, default title template
- The 25 keywords (full list + per-page subsets)
- Default OG image URL
- Robots defaults

## Files Changed
- `index.html` — Add meta keywords, robots, enhanced OG tags
- `src/lib/seoConstants.ts` — New constants file
- `src/pages/LandingPage.tsx` — Add Helmet with per-page SEO
- `src/pages/BlogIndex.tsx` — Add Helmet with per-page SEO
- `src/pages/BlogPost.tsx` — Extend Helmet with keywords, OG, Twitter, article meta
- `src/pages/Auth.tsx` — Add Helmet with noindex
- `src/pages/NotFound.tsx` — Add Helmet with noindex
- `public/robots.txt` — Add Sitemap directive

