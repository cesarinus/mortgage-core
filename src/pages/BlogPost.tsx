import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BlogCTA from "@/components/blog/BlogCTA";
import RecommendedBusinesses from "@/components/blog/RecommendedBusinesses";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowLeft, User } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Post {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[];
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  created_at: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (!error && data) {
        setPost(data as Post);

        // Fetch related posts
        const { data: relatedData } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, category, created_at")
          .eq("status", "published")
          .neq("id", data.id)
          .limit(3)
          .order("created_at", { ascending: false });

        if (relatedData) setRelated(relatedData);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  // Process content to replace module placeholders
  const processContent = (html: string) => {
    return html.replace(
      /<div\s+data-module="recommended-businesses"\s+data-category="([^"]+)"[^>]*><\/div>/g,
      '<div class="blog-module-placeholder" data-category="$1"></div>'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-8 h-6 w-1/2" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Split content to inject modules
  const contentParts = post.content_html.split(
    /<div\s+data-module="recommended-businesses"\s+data-category="([^"]+)"[^>]*><\/div>/g
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.meta_title || post.title} | NexGenSWFL</title>
        <meta name="description" content={post.meta_description || post.excerpt || ""} />
        <link rel="canonical" href={`https://ngcapital.net/blog/${post.slug}`} />
      </Helmet>

      <Navbar />

      <article className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* Back link */}
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          {post.category && (
            <Badge variant="secondary" className="mb-3">
              {post.category}
            </Badge>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {new Date(post.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-10 overflow-hidden rounded-2xl">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Content with embedded modules */}
        <div className="prose prose-lg max-w-none">
          {contentParts.map((part, i) => {
            // Odd indices are category captures from the regex
            if (i % 2 === 1) {
              return <RecommendedBusinesses key={`module-${i}`} category={part} limit={3} />;
            }
            return (
              <div
                key={`content-${i}`}
                dangerouslySetInnerHTML={{ __html: part }}
              />
            );
          })}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <BlogCTA />

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-bold text-foreground">
              Related Articles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
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
        )}
      </article>

      <Footer />
    </div>
  );
};

export default BlogPost;
