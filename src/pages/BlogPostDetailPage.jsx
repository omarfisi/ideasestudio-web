import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBlogPostBySlug, getBlogRelated } from "@/lib/api.js";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/components/seo/schema.js";
import { usePageSeo } from "@/hooks/usePageSeo.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es-PR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function estimateReadingTimeFromHtml(html = "") {
  const words = String(html)
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getYoutubeEmbedUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    }
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    if (u.pathname.includes("/shorts/")) {
      return `https://www.youtube.com/embed/${u.pathname.split("/shorts/")[1]}`;
    }
    if (u.pathname.includes("/embed/")) return url;
  } catch {
    // URL inválida
  }
  return "";
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) =>
    typeof tag === "string"
      ? { name: tag, slug: tag.toLowerCase().replace(/\s+/g, "-") }
      : { name: tag?.name || "", slug: tag?.slug || String(tag?.name || "").toLowerCase().replace(/\s+/g, "-") }
  );
}

function splitBlocks(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length <= 2) return { top: blocks, middle: [], bottom: [] };
  const a = Math.ceil(blocks.length * 0.35);
  const b = Math.ceil(blocks.length * 0.7);
  return { top: blocks.slice(0, a), middle: blocks.slice(a, b), bottom: blocks.slice(b) };
}

// ─── MetaLine ─────────────────────────────────────────────────────────────────

function MetaLine({ items = [] }) {
  const visible = items.filter(Boolean);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
      {visible.map((item, i) => (
        <span key={i} className="flex items-center gap-4">
          {i > 0 && <span className="h-1 w-1 rounded-full bg-neutral-400" />}
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── AuthorSidebarCard ────────────────────────────────────────────────────────

function AuthorSidebarCard({ author, authorName }) {
  const name = author?.name || authorName || "Ideas Estudio";
  const avatar =
    author?.avatar_url ||
    "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

  return (
    <aside className="rounded-[28px] border border-[#e8e1d8] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col items-center text-center">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-[#f2cc3d]">
          <img
            src={avatar}
            alt={author?.avatar_alt || name}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-neutral-950">{name}</h3>
        {author?.short_description && (
          <p className="mt-2 text-sm leading-7 text-neutral-600">{author.short_description}</p>
        )}
      </div>
    </aside>
  );
}

// ─── AuthorFooterCard ─────────────────────────────────────────────────────────

function AuthorFooterCard({ author, authorName }) {
  const name = author?.name || authorName || "Ideas Estudio";
  const avatar =
    author?.avatar_url ||
    "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

  return (
    <section className="rounded-[30px] border border-[#e8e1d8] bg-white p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-[96px_1fr] md:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full bg-[#f2cc3d]">
          <img
            src={avatar}
            alt={author?.avatar_alt || name}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Autor del artículo</p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-950">{name}</h3>
          {author?.short_description && (
            <p className="mt-2 text-sm font-medium text-neutral-700">{author.short_description}</p>
          )}
          {author?.bio && (
            <p className="mt-4 max-w-3xl text-[15px] leading-8 text-neutral-600">{author.bio}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── YoutubeEmbed ─────────────────────────────────────────────────────────────

function YoutubeEmbed({ url, title }) {
  const embedUrl = getYoutubeEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <section className="my-12">
      <div className="overflow-hidden rounded-[28px] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title || "Video del artículo"}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

// ─── ContentBlock ─────────────────────────────────────────────────────────────

function ContentBlock({ block }) {
  if (!block || typeof block !== "object") return null;

  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3 className="mt-10 text-2xl font-semibold leading-tight text-neutral-950 md:text-3xl">
          {block.text}
        </h3>
      ) : (
        <h2 className="mt-12 text-3xl font-semibold leading-tight text-neutral-950 md:text-4xl">
          {block.text}
        </h2>
      );

    case "paragraph": {
      const html = String(block.text || "").trim();
      const cleaned = html
        .replace(/<br\s*\/?>/gi, "")
        .replace(/&nbsp;/gi, "")
        .trim();

      if (!cleaned) return null;

      return (
        <div
          className="mt-6 text-[16px] leading-8 text-neutral-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    case "quote":
      return (
        <blockquote className="my-10 border-l-4 border-[#f0d24a] pl-6 text-lg leading-9 text-neutral-700 md:pl-8">
          {block.text}
        </blockquote>
      );

    case "list":
      if (!Array.isArray(block.items) || !block.items.length) return null;
      return block.style === "ordered" ? (
        <ol className="mt-6 list-decimal space-y-3 pl-6 text-[16px] leading-8 text-neutral-700">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      ) : (
        <ul className="mt-6 list-disc space-y-3 pl-6 text-[16px] leading-8 text-neutral-700">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );

    case "image":
      return (
        <figure className="my-10 overflow-hidden rounded-[26px] bg-white">
          <img
            src={block.url}
            alt={block.alt || block.caption || "Imagen del artículo"}
            className="w-full object-cover"
          />
        </figure>
      );

    case "gallery":
      return (
        <GallerySlideshow
          images={block.images || []}
          title={block.title}
          description={block.description}
          variant={block.variant || "slideshow"}
        />
      );

    case "cta":
      return (
        <section className="my-12 rounded-[28px] border border-[#eadfcd] bg-[#faf6ef] p-6 md:p-8">
          {block.title && (
            <h3 className="text-2xl font-semibold text-neutral-950">{block.title}</h3>
          )}
          {block.text && (
            <p className="mt-3 max-w-2xl text-[15px] leading-8 text-neutral-600">{block.text}</p>
          )}
          {block.url && block.label && (
            <a
              href={block.url}
              className="mt-5 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#f0d24a] hover:text-black"
            >
              {block.label}
            </a>
          )}
        </section>
      );

    default:
      return null;
  }
}

// ─── GallerySlideshow — main image + nav arrows + dot indicators + thumbnails ──

function GallerySlideshow({ images, title, description, variant = "slideshow" }) {
  const [current, setCurrent] = useState(0);
  if (!images?.length) return null;
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  // Grid variant
  if (variant === "grid") {
    return (
      <div className="my-8">
        {(title || description) && (
          <div className="mb-4">
            {title && <h3 className="text-lg font-semibold text-slate-800">{title}</h3>}
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((img, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-slate-100">
              <img src={img.url} alt={img.alt || ""} className="w-full aspect-[4/3] object-cover" />
              {img.caption && <p className="px-3 py-2 text-xs text-slate-500 italic">{img.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slideshow / carousel variant
  return (
    <div className="my-8 rounded-2xl overflow-hidden shadow-md bg-slate-50">
      {(title || description) && (
        <div className="px-5 pt-5 pb-3">
          {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      {/* Main image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={images[current].url}
          alt={images[current].alt || ""}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors text-slate-700 font-bold">
              ‹
            </button>
            <button onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors text-slate-700 font-bold">
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Caption for current image */}
      {images[current]?.caption && (
        <p className="px-5 py-2 text-xs text-slate-500 italic text-center">{images[current].caption}</p>
      )}
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={img.url} alt={img.alt || ""} className="h-14 w-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Legacy block normalizers ─────────────────────────────────────────────────

function isBreakOnlyParagraph(block) {
  if (block?.type !== "paragraph") return false;

  const cleaned = String(block?.text || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return !cleaned;
}

function normalizeLegacyBlocks(input = []) {
  const blocks = Array.isArray(input) ? input : [];
  const normalized = [];

  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (isBreakOnlyParagraph(block)) {
      i++;
      continue;
    }

    if (block?.type === "image") {
      const galleryImages = [];
      let j = i;

      while (j < blocks.length) {
        const current = blocks[j];

        if (isBreakOnlyParagraph(current)) {
          j++;
          continue;
        }

        if (current?.type !== "image") break;

        if (current?.url) {
          galleryImages.push({
            url: current.url,
            alt: current.alt || current.caption || "",
          });
        }

        j++;
      }

      if (galleryImages.length > 1) {
        normalized.push({
          type: "gallery",
          images: galleryImages,
        });
        i = j;
        continue;
      }

      if (galleryImages.length === 1) {
        normalized.push(block);
        i = j;
        continue;
      }
    }

    normalized.push(block);
    i++;
  }

  return normalized;
}

// ─── ArticleContent ───────────────────────────────────────────────────────────

function ArticleContent({ post }) {
  const rawBlocks = Array.isArray(post?.content_json) ? post.content_json : [];
  const blocks = normalizeLegacyBlocks(rawBlocks);
  const hasBlocks = blocks.length > 0;
  const videoEnabled = Boolean(post?.show_youtube_embed) && Boolean(post?.youtube_url);
  const videoPosition = post?.youtube_position || "bottom";
  const { top, middle, bottom } = splitBlocks(blocks);

  if (!hasBlocks && post?.content_html) {
    return (
      <div
        className="prose prose-lg max-w-none prose-headings:text-neutral-950 prose-p:text-neutral-700 prose-p:leading-9 prose-li:text-neutral-700 prose-blockquote:border-l-[#f0d24a] prose-blockquote:text-neutral-700 prose-img:rounded-[24px]"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
      />
    );
  }

  if (!hasBlocks) {
    return (
      <div className="mt-8 rounded-[20px] border border-neutral-100 bg-neutral-50 px-8 py-12 text-center text-neutral-400">
        Contenido próximamente.
      </div>
    );
  }

  return (
    <>
      {videoEnabled && videoPosition === "top" && (
        <YoutubeEmbed url={post.youtube_url} title={post.youtube_title} />
      )}
      {top.map((block, i) => <ContentBlock key={`top-${i}`} block={block} />)}

      {videoEnabled && videoPosition === "middle" && (
        <YoutubeEmbed url={post.youtube_url} title={post.youtube_title} />
      )}
      {middle.map((block, i) => <ContentBlock key={`mid-${i}`} block={block} />)}
      {bottom.map((block, i) => <ContentBlock key={`bot-${i}`} block={block} />)}

      {videoEnabled && videoPosition === "bottom" && (
        <YoutubeEmbed url={post.youtube_url} title={post.youtube_title} />
      )}
    </>
  );
}

// ─── RelatedCard ──────────────────────────────────────────────────────────────

function RelatedCard({ post }) {
  const image =
    post?.featured_image_url ||
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80";

  return (
    <article className="group">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="overflow-hidden rounded-[24px] bg-white">
          <img
            src={image}
            alt={post?.featured_image_alt || post?.title || "Artículo"}
            className="h-[220px] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
        <div className="pt-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            {post?.category_name || "Artículo"}
          </p>
          <h3 className="mt-3 text-xl font-semibold leading-[1.15] text-neutral-950">
            {post?.title}
          </h3>
          {post?.excerpt && (
            <p className="mt-2 text-[14px] leading-7 text-neutral-600 line-clamp-2">{post.excerpt}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

// ─── BlogPostDetailPage ───────────────────────────────────────────────────────

export default function BlogPostDetailPage({ initialPost = null, initialRelated = null }) {
  const pageSeo = usePageSeo();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [related, setRelated] = useState(initialRelated || []);
  const [loading, setLoading] = useState(!initialPost);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Si se pasan datos estáticos (modo preview), no llamar al API
    if (initialPost) return;
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getBlogPostBySlug(slug)
      .then((res) => {
        if (cancelled) return;
        setPost(res?.item || null);
        getBlogRelated(slug)
          .then((r) => { if (!cancelled) setRelated(r?.items?.slice(0, 3) || []); })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug, initialPost]);

  // SEO is now handled declaratively via SEOHead below — no DOM mutation needed.

  const articleDate = useMemo(
    () => formatDate(post?.published_at || post?.publish_at || post?.created_at),
    [post]
  );

  const readingTime = useMemo(() => {
    if (!post) return "";
    if (post.reading_time_minutes) return `${post.reading_time_minutes} min de lectura`;
    if (post.content_html) return `${estimateReadingTimeFromHtml(post.content_html)} min de lectura`;
    const blocks = Array.isArray(post.content_json) ? post.content_json : [];
    const text = blocks
      .map((b) => {
        if (["paragraph", "heading", "quote"].includes(b?.type)) return b.text || "";
        if (b?.type === "list" && Array.isArray(b.items)) return b.items.join(" ");
        return "";
      })
      .join(" ");
    return `${Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200))} min de lectura`;
  }, [post]);

  const tags = useMemo(() => normalizeTags(post?.tags), [post]);
  const categoryLabel = post?.category?.name || post?.category_name || "Blog";
  const featuredImage =
    post?.featured_image_url ||
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80";

  // ── Loading ──
  if (loading) {
    return (
      <main className="bg-white text-neutral-950">
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="animate-pulse">
            <div className="mx-auto h-4 w-48 rounded bg-neutral-200" />
            <div className="mx-auto mt-6 h-14 w-full max-w-4xl rounded bg-neutral-200" />
            <div className="mx-auto mt-4 h-14 w-full max-w-3xl rounded bg-neutral-200" />
            <div className="mx-auto mt-8 h-[420px] w-full max-w-5xl rounded-[28px] bg-neutral-200" />
          </div>
        </section>
      </main>
    );
  }

  // ── Not found ──
  if (notFound || !post) {
    return (
      <main className="bg-white text-neutral-950">
        <section className="mx-auto max-w-4xl px-4 py-24 text-center md:px-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Blog</p>
          <h1 className="mt-4 text-4xl font-semibold text-neutral-950 md:text-5xl">
            Artículo no encontrado
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-8 text-neutral-600">
            Revisa el enlace o vuelve al blog para seguir explorando contenido.
          </p>
          <button
            className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#f0d24a] hover:text-black"
            onClick={() => navigate("/blog")}
          >
            Volver al blog
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-white text-neutral-950">
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || undefined}
        ogImage={post.og_image_url || post.featured_image_url || undefined}
        ogType="article"
        canonical={`https://ideasestudio.com/blog/${post.slug}`}
        jsonLd={[
          buildArticleSchema(post),
          buildBreadcrumbSchema([
            { name: "Inicio", url: "https://ideasestudio.com" },
            { name: "Blog", url: "https://ideasestudio.com/blog" },
            { name: post.title, url: `https://ideasestudio.com/blog/${post.slug}` },
          ]),
        ].filter(Boolean)}
        seoEntry={pageSeo}
      />

      {/* ── A. HERO ── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 md:px-6 md:pb-16 md:pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <MetaLine items={[categoryLabel, articleDate, readingTime]} />

          <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-[-0.03em] text-neutral-950 md:text-7xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mx-auto mt-6 max-w-3xl text-[16px] leading-9 text-neutral-600 md:text-[18px]">
              {post.excerpt}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full border border-[#ddd4c7] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-700"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── B. IMAGEN DESTACADA ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
          <img
            src={featuredImage}
            alt={post.featured_image_alt || post.title}
            className="max-h-[680px] w-full object-cover"
          />
        </div>
      </section>

      {/* ── C. AUTOR LATERAL + CONTENIDO ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
        <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">

          {/* Autor sticky */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <AuthorSidebarCard author={post.author} authorName={post.author_name} />
            <div className="mt-6">
              <Link
                to="/blog"
                className="inline-flex text-sm font-medium text-neutral-600 transition hover:text-black"
              >
                ← Volver al blog
              </Link>
            </div>
          </div>

          {/* Contenido editorial */}
          <article>
            <div className="mx-auto max-w-3xl">
              <ArticleContent post={post} />
            </div>
          </article>
        </div>
      </section>

      {/* ── D. AUTOR FINAL ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <AuthorFooterCard author={post.author} authorName={post.author_name} />
      </section>

      {/* ── E. ARTÍCULOS RELACIONADOS ── */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-4 md:px-6 md:pb-20">
          <div className="border-t border-[#e7dfd5] pt-14">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Sigue leyendo</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-neutral-950">
                Artículos relacionados
              </h2>
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <RelatedCard key={item.id || item.slug} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── F. CTA FINAL ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6 md:pb-24">
        <div className="rounded-[34px] bg-black px-8 py-12 text-center text-white md:px-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Ideas Estudio</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl">
            Si este contenido conecta con lo que quieres construir, podemos ayudarte a llevarlo a tu marca o negocio.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/servicios"
              className="rounded-full bg-[#f0d24a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:opacity-90"
            >
              Ver servicios
            </Link>
            <Link
              to="/contacto"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/50"
            >
              Contactar
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
