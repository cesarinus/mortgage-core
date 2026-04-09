import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { scoreRelatedPosts } from "@/lib/internalLinking";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  created_at: string;
}

interface RelatedPostsProps {
  postId: string;
  keywords: string[];
  tags: string[];
  category: string | null;
  limit?: number;
}

const RelatedPosts = ({ postId, keywords, tags, category, limit = 3 }: RelatedPostsProps) => {
  const [posts, setPosts] = useState<RelatedPost[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, created_at, keywords, tags")
        .eq("status", "published")
        .neq("id", postId);

      if (!data || data.length === 0) return;

      const scored = scoreRelatedPosts(keywords, tags, category, data as any);

      if (scored.length > 0) {
        const relatedIds = scored.slice(0, limit).map((s) => s.id);
        setPosts(data.filter((d) => relatedIds.includes(d.id)).slice(0, limit) as RelatedPost[]);
      } else {
        // Fallback: recent posts
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPosts(sorted.slice(0, limit));
      }
    };
    fetchRelated();
  }, [postId, keywords, tags, category, limit]);

  if (posts.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-6 font-display text-2xl font-bold text-foreground">
        Related Articles
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((r) => (
          <Link
            key={r.id}
            to={`/blog/${r.slug}`}
            className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            {r.category && (
              <Badge variant="secondary" className="mb-2 text-xs">
                {r.category}
              </Badge>
            )}
            <h3 className="font-display text-base font-semibold text-foreground transition-colors group-hover:text-primary">
              {r.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {r.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;
