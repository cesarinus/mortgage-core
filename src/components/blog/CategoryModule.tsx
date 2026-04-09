import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FolderOpen } from "lucide-react";

interface CategoryModuleProps {
  currentCategory?: string | null;
}

const CategoryModule = ({ currentCategory }: CategoryModuleProps) => {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("status", "published")
        .not("category", "is", null);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          if (p.category) {
            counts[p.category] = (counts[p.category] || 0) + 1;
          }
        });
        setCategories(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    };
    fetch();
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Categories</h3>
      </div>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.name}>
            <Link
              to={`/blog?category=${encodeURIComponent(cat.name)}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${
                currentCategory === cat.name
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs text-muted-foreground">{cat.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryModule;
