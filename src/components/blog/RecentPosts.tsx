import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Newspaper } from "lucide-react";

interface RecentPost {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  created_at: string;
}

interface RecentPostsProps {
  currentPostId?: string;
  limit?: number;
}

const RecentPosts = ({ currentPostId, limit = 5 }: RecentPostsProps) => {
  const [posts, setPosts] = useState<RecentPost[]>([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from("blog_posts")
        .select("id, title, slug, featured_image, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      const { data } = await query;
      if (data) {
        setPosts(data.filter((p) => p.id !== currentPostId).slice(0, limit));
      }
    };
    fetch();
  }, [currentPostId, limit]);

  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Recent Articles</h3>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="group flex gap-3"
          >
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0">
              <h4 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {post.title}
              </h4>
              <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentPosts;
