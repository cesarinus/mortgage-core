import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BlogSidebar from "@/components/blog/BlogSidebar";
import RelatedPosts from "@/components/blog/RelatedPosts";

import StickyFloatingCTA from "@/components/blog/StickyFloatingCTA";
import ExitIntentModal from "@/components/blog/ExitIntentModal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowLeft, User } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { injectInternalLinks } from "@/lib/internalLinking";
import { useBlogTracking } from "@/hooks/useBlogTracking";
import { useBlogVariants } from "@/hooks/useBlogVariants";

interface Post {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[];
  keywords: string[];
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

interface LinkablePost {
  id: string;
  title: string;
  slug: string;
  keywords: string[] | null;
  tags: string[] | null;
  category: string | null;
}

const stripExternalModules = (html: string): string =>
  html.replace(/<div\s+data-module="[^"]*"[^>]*><\/div>/g, "");

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [linkablePosts, setLinkablePosts] = useState<LinkablePost[]>([]);
  const [loading, setLoading] = useState(true);

  const { trackCTA } = useBlogTracking({ postId: post?.id, enabled: !!post });
  const { variant, getEffectiveVariant, adjustForLowScroll, trackImpression, trackClick } =
    useBlogVariants(post?.id);

  // Track impression once variant is assigned
  useEffect(() => {
    if (post && variant.id) trackImpression();
  }, [post, variant.id, trackImpression]);

  // Monitor scroll for dynamic adjustment
  useEffect(() => {
    if (!post) return;
    const handleScroll = () => {
      const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      adjustForLowScroll(pct);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [post, adjustForLowScroll]);

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
        const { data: others } = await supabase
          .from("blog_posts")
          .select("id, title, slug, keywords, tags, category")
          .eq("status", "published")
          .neq("id", data.id);
        if (others) setLinkablePosts(others as LinkablePost[]);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  const handleCTAClick = useCallback(
    (ctaName: string) => {
      trackCTA(ctaName);
      trackClick();
    },
    [trackCTA, trackClick]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-6xl px-4 py-12">
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
        <div className="container mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const effectiveVariant = getEffectiveVariant();
  const cleanContent = stripExternalModules(post.content_html);
  const enrichedContent = injectInternalLinks(cleanContent, linkablePosts, 5);


  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.meta_title || post.title} | NexGenSWFL</title>
        <meta name="description" content={post.meta_description || post.excerpt || ""} />
        <link rel="canonical" href={`https://ngcapital.net/blog/${post.slug}`} />
      </Helmet>

      <Navbar />

      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        <div className="mt-4 flex flex-col gap-10 lg:flex-row">
          <article className="min-w-0 flex-1">
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

            {post.featured_image && (
              <div className="mb-10 overflow-hidden rounded-2xl">
                <img src={post.featured_image} alt={post.title} className="w-full object-cover" loading="lazy" />
              </div>
            )}

            <div
              className="prose prose-lg max-w-none prose-p:my-4 prose-headings:mt-8 prose-headings:mb-4"
              dangerouslySetInnerHTML={{ __html: enrichedContent }}
            />

            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
                {post.tags.map((tag) => (
                  <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="outline" className="cursor-pointer text-xs transition-colors hover:bg-primary hover:text-primary-foreground">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            <RelatedPosts
              postId={post.id}
              keywords={post.keywords || []}
              tags={post.tags || []}
              category={post.category}
            />
          </article>

          <div className="w-full lg:w-[300px] lg:flex-shrink-0">
            <BlogSidebar
              tags={post.tags || []}
              currentPostId={post.id}
              currentCategory={post.category}
              showTags={true}
              showRecent={true}
              showCategories={true}
              onCTAClick={handleCTAClick}
              variant={effectiveVariant}
              onVariantClick={trackClick}
            />
          </div>
        </div>
      </div>

      {/* Sticky floating CTA */}
      {effectiveVariant.cta_position === "sticky" && (
        <StickyFloatingCTA ctaText={effectiveVariant.cta_text} onCTAClick={handleCTAClick} onVariantClick={trackClick} />
      )}

      {/* Exit intent modal */}
      <ExitIntentModal enabled={true} onCTAClick={handleCTAClick} />

      <Footer />
    </div>
  );
};

export default BlogPost;
