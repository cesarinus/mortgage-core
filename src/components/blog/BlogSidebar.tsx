import TagModule from "./TagModule";
import RecentPosts from "./RecentPosts";
import CategoryModule from "./CategoryModule";
import DynamicBlogCTA from "./DynamicBlogCTA";
import TestimonialCTA from "./TestimonialCTA";
import UrgencyCTA from "./UrgencyCTA";
import type { BlogVariant } from "@/hooks/useBlogVariants";
import { DEFAULT_VARIANT } from "@/hooks/useBlogVariants";

interface BlogSidebarProps {
  tags?: string[];
  currentPostId?: string;
  currentCategory?: string | null;
  showTags?: boolean;
  showRecent?: boolean;
  showCategories?: boolean;
  onCTAClick?: (ctaName: string) => void;
  variant?: BlogVariant;
  onVariantClick?: () => void;
}

const BlogSidebar = ({
  tags = [],
  currentPostId,
  currentCategory,
  showTags = true,
  showRecent = true,
  showCategories = true,
  onCTAClick,
  variant = DEFAULT_VARIANT,
  onVariantClick,
}: BlogSidebarProps) => {
  const renderSidebarModule = () => {
    switch (variant.sidebar_module) {
      case "testimonial":
        return <TestimonialCTA onCTAClick={onCTAClick} onVariantClick={onVariantClick} />;
      case "urgency":
        return <UrgencyCTA onCTAClick={onCTAClick} onVariantClick={onVariantClick} />;
      default:
        return <DynamicBlogCTA variant={variant} onCTAClick={onCTAClick} onVariantClick={onVariantClick} />;
    }
  };

  return (
    <aside className="space-y-6 lg:sticky lg:top-8">
      {showTags && <TagModule tags={tags} />}
      <DynamicBlogCTA variant={variant} onCTAClick={onCTAClick} onVariantClick={onVariantClick} />
      {variant.sidebar_module === "testimonial" && (
        <TestimonialCTA onCTAClick={onCTAClick} onVariantClick={onVariantClick} />
      )}
      {variant.sidebar_module === "urgency" && (
        <UrgencyCTA onCTAClick={onCTAClick} onVariantClick={onVariantClick} />
      )}
      {showRecent && <RecentPosts currentPostId={currentPostId} limit={5} />}
      {showCategories && <CategoryModule currentCategory={currentCategory} />}
    </aside>
  );
};

export default BlogSidebar;
