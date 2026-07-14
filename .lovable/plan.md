## Goal
Every social media post (new + existing) includes a "Get Started" CTA linking to the main site's ApplicationHub trigger — both appended to the post text and stored in `cta_link`.

## Landing URL
Reuse the existing `?start=1` query param already handled in `src/pages/LandingPage.tsx` (lines 28–34), which auto-opens `ApplicationHub`. No landing-page changes needed.

Final CTA URL: `${SITE_URL}/?start=1` (e.g. `https://nexgencapitalfinance.com/?start=1`).

## Changes

### 1. `supabase/functions/generate-social-content/index.ts`
- Change the AI prompt default from `${website}/book` to `${website}/?start=1` and rename the CTA intent to "Get Started".
- After parsing, force `cta_link = \`${website}/?start=1\`` (ignore model output) so it's guaranteed on every generated post.
- Append a CTA line to `post_text` if not already present:
  `\n\n👉 Get Started: ${website}/?start=1`
  (skip append if `post_text` already contains `/?start=1`).

### 2. `supabase/functions/publish-to-social/index.ts`
- In `buildText()` (around line 56), ensure the Get Started CTA line is appended when missing, so existing draft posts without it still publish with the CTA in the body.
- Facebook publishing already uses `post.cta_link` as the `link` param — no change needed; it will now always be set.

### 3. Frontend: `src/components/social-media/PostEditor.tsx` and `PostGenerator.tsx`
- On save, if `cta_link` is empty, default it to `${window.location.origin}/?start=1`.
- Show a small helper hint under the CTA link field: "Defaults to Get Started (opens application hub)".

### 4. Backfill existing posts (one-time SQL migration)
```sql
UPDATE public.social_media_posts
SET cta_link = 'https://nexgencapitalfinance.com/?start=1'
WHERE cta_link IS NULL OR cta_link = '';
```
(Text bodies of already-published posts are not modified; only drafts/scheduled will get the appended line at publish time via change #2.)

## Out of scope
- No changes to `ApplicationHub`, `Navbar`, or landing page — `?start=1` handler already exists.
- LinkedIn/Instagram button widgets aren't supported for organic posts; the CTA is delivered as text + link preview.