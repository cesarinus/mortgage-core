/**
 * Internal linking utilities for blog posts.
 * - Scores related posts by keyword overlap
 * - Injects contextual internal links into article HTML
 */

interface LinkablePost {
  id: string;
  title: string;
  slug: string;
  keywords: string[] | null;
  tags: string[] | null;
  category: string | null;
}

/**
 * Score relatedness between a source post and candidate posts
 * using keyword/tag overlap + category match.
 */
export function scoreRelatedPosts(
  sourceKeywords: string[],
  sourceTags: string[],
  sourceCategory: string | null,
  candidates: LinkablePost[]
): (LinkablePost & { score: number })[] {
  const srcKw = new Set(sourceKeywords.map((k) => k.toLowerCase()));
  const srcTags = new Set(sourceTags.map((t) => t.toLowerCase()));

  return candidates
    .map((c) => {
      let score = 0;
      const cKw = (c.keywords || []).map((k) => k.toLowerCase());
      const cTags = (c.tags || []).map((t) => t.toLowerCase());

      // Keyword overlap (strongest signal, 3 pts each)
      cKw.forEach((k) => {
        if (srcKw.has(k)) score += 3;
      });

      // Tag overlap (2 pts each)
      cTags.forEach((t) => {
        if (srcTags.has(t)) score += 2;
      });

      // Category match (1 pt)
      if (sourceCategory && c.category?.toLowerCase() === sourceCategory.toLowerCase()) {
        score += 1;
      }

      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Inject up to `maxLinks` internal links into article HTML
 * by matching keyword phrases to linkable posts.
 * Only links the first occurrence of each phrase and avoids
 * linking inside existing <a> tags or headings.
 */
export function injectInternalLinks(
  html: string,
  posts: LinkablePost[],
  maxLinks = 5
): string {
  if (!posts.length) return html;

  // Build a map: keyword phrase → post (first match wins)
  const phraseMap = new Map<string, LinkablePost>();
  for (const post of posts) {
    for (const kw of post.keywords || []) {
      const lower = kw.toLowerCase();
      if (!phraseMap.has(lower) && lower.length >= 4) {
        phraseMap.set(lower, post);
      }
    }
    // Also try the title as a linkable phrase
    const titleLower = post.title.toLowerCase();
    if (!phraseMap.has(titleLower)) {
      phraseMap.set(titleLower, post);
    }
  }

  // Sort phrases longest-first to avoid partial matches
  const phrases = Array.from(phraseMap.keys()).sort((a, b) => b.length - a.length);

  let linksAdded = 0;
  const linkedSlugs = new Set<string>();
  let result = html;

  for (const phrase of phrases) {
    if (linksAdded >= maxLinks) break;

    const post = phraseMap.get(phrase)!;
    if (linkedSlugs.has(post.slug)) continue;

    // Match the phrase only in text content (not inside tags or existing links)
    // Negative lookbehind for being inside an <a> or heading tag
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<![<\\/a-zA-Z])\\b(${escaped})\\b(?![^<]*<\\/a>)(?![^<]*<\\/h[1-6]>)`,
      "i"
    );

    const match = result.match(regex);
    if (match && match.index !== undefined) {
      // Verify we're not inside a tag
      const before = result.slice(0, match.index);
      const lastOpen = before.lastIndexOf("<");
      const lastClose = before.lastIndexOf(">");
      if (lastOpen > lastClose) continue; // inside a tag

      const linked = `<a href="/blog/${post.slug}" class="text-primary hover:underline" title="${post.title}">${match[0]}</a>`;
      result = result.slice(0, match.index) + linked + result.slice(match.index + match[0].length);
      linksAdded++;
      linkedSlugs.add(post.slug);
    }
  }

  return result;
}
