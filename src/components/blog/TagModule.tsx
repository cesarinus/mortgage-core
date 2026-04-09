import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";

interface TagModuleProps {
  tags: string[];
}

const TagModule = ({ tags }: TagModuleProps) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Tags</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`}>
            <Badge
              variant="outline"
              className="cursor-pointer text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {tag}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TagModule;
