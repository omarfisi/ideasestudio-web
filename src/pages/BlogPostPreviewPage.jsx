/**
 * BlogPostPreviewPage
 * Preview del layout de artículo con datos estáticos.
 * Ruta: /blog/preview
 */
import BlogPostDetailPage from "./BlogPostDetailPage.jsx";
import { DEMO_POST, DEMO_RELATED } from "../data/blogDemoPost.js";

export default function BlogPostPreviewPage() {
  return <BlogPostDetailPage initialPost={DEMO_POST} initialRelated={DEMO_RELATED} />;
}
