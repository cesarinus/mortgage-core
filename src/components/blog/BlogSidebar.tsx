import TagModule from "./TagModule";
import RecentPosts from "./RecentPosts";
import CategoryModule from "./CategoryModule";
import BlogCTA from "./BlogCTA";

interface BlogSidebarProps {
  tags?: string[];
  currentPostId?: string;
  currentCategory?: string | null;
  showTags?: boolean;
  showRecent?: boolean;
  showCategories?: boolean;
  onCTAClick?: (ctaName: string) => void;
}

const BlogSidebar = ({
  tags = [],
  currentPostId,
  currentCategory,
  showTags = true,
  showRecent = true,
  showCategories = true,
  onCTAClick,
}: BlogSidebarProps) => {
  return (
    <aside className="space-y-6 lg:sticky lg:top-8">
      {showTags && <TagModule tags={tags} />}
      {showRecent && <RecentPosts currentPostId={currentPostId} limit={5} />}
      {showCategories && <CategoryModule currentCategory={currentCategory} />}
      <BlogCTA onCTAClick={onCTAClick} />
    </aside>
  );
};

export default BlogSidebar;
