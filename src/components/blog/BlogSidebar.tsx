import TagModule from "./TagModule";
import RecentPosts from "./RecentPosts";
import CategoryModule from "./CategoryModule";

interface BlogSidebarProps {
  tags?: string[];
  currentPostId?: string;
  currentCategory?: string | null;
  showTags?: boolean;
  showRecent?: boolean;
  showCategories?: boolean;
}

const BlogSidebar = ({
  tags = [],
  currentPostId,
  currentCategory,
  showTags = true,
  showRecent = true,
  showCategories = true,
}: BlogSidebarProps) => {
  return (
    <aside className="space-y-6 lg:sticky lg:top-8">
      {showTags && <TagModule tags={tags} />}
      {showRecent && <RecentPosts currentPostId={currentPostId} limit={5} />}
      {showCategories && <CategoryModule currentCategory={currentCategory} />}
    </aside>
  );
};

export default BlogSidebar;
