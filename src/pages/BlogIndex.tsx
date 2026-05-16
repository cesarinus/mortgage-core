import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowRight } from "lucide-react";
import { SITE_URL, BLOG_KEYWORDS_STRING } from "@/lib/seoConstants";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[];
  author: string;
  created_at: string;
}

const BlogIndex = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, category, tags, author, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!error && data) setPosts(data as BlogPost[]);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[];
  const filtered = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;
  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mortgage Blog | NexGen Capital</title>
        <meta name="description" content="Expert mortgage insights, rate updates, and homebuying guides for Southwest Florida. Stay informed with NexGen Capital's blog." />
        <meta name="keywords" content={BLOG_KEYWORDS_STRING} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta property="og:title" content="Mortgage Blog | NexGen Capital" />
        <meta property="og:description" content="Expert mortgage insights, rate updates, and homebuying guides for Southwest Florida." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:site_name" content="NexGen Capital" />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-background to-accent/30 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Insights &amp; Resources for{" "}
            <span className="text-primary">Southwest Florida</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Real estate, business, and local growth insights
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat!)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg text-muted-foreground">No articles published yet. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <Link
                to={`/blog/${featured.slug}`}
                className="group mb-10 block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="grid md:grid-cols-2">
                  <div className="aspect-video bg-muted md:aspect-auto">
                    {featured.featured_image ? (
                      <img
                        src={featured.featured_image}
                        alt={featured.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full min-h-[240px] items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
                        <span className="text-6xl font-bold text-primary/20">N</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-6 md:p-10">
                    {featured.category && (
                      <Badge variant="secondary" className="mb-3 w-fit">
                        {featured.category}
                      </Badge>
                    )}
                    <h2 className="font-display text-2xl font-bold text-foreground transition-colors group-hover:text-primary md:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-muted-foreground">
                      {featured.excerpt}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(featured.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-primary group-hover:underline">
                        Read More <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="aspect-video bg-muted">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
                        <span className="text-4xl font-bold text-primary/20">N</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    {post.category && (
                      <Badge variant="secondary" className="mb-2">
                        {post.category}
                      </Badge>
                    )}
                    <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="font-medium text-primary">Read More →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BlogIndex;
