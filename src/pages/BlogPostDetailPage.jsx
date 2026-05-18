import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBlogPostBySlug, getBlogRelated, getBlogComments, submitBlogComment, getBlogCategories, getBlogPosts } from "@/lib/api.js";
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

// ─── Author helpers ───────────────────────────────────────────────────────────

function getAuthorAvatar(author = {}, post = {}) {
  return (
    author.avatar_url ||
    author.image_url ||
    author.photo_url ||
    post.author_avatar_url ||
    post.author_image_url ||
    post.author_avatar ||
    ""
  );
}

function normalizeAuthorSocialLinks(author = {}) {
  const links = author.social_links || {};
  return [
    { key: "website",   label: "Web",       href: links.website },
    { key: "instagram", label: "Instagram",  href: links.instagram },
    { key: "facebook",  label: "Facebook",   href: links.facebook },
    { key: "linkedin",  label: "LinkedIn",   href: links.linkedin },
    { key: "youtube",   label: "YouTube",    href: links.youtube },
    { key: "tiktok",    label: "TikTok",     href: links.tiktok },
    { key: "x",         label: "X",          href: links.x },
  ].filter((item) => item.href);
}

function AuthorAvatar({ author = {}, post = {}, size = "md" }) {
  const avatar = getAuthorAvatar(author, post);
  const name = author.name || post.author_name || "A";
  const dim = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-xl";
  if (avatar) {
    return (
      <div className={`${dim} overflow-hidden rounded-full bg-[#f2cc3d] shrink-0`}>
        <img src={avatar} alt={author.avatar_alt || name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${dim} flex items-center justify-center rounded-full bg-[#f2cc3d] shrink-0 ${text} font-bold text-black`}>
      {name?.[0]?.toUpperCase() || "A"}
    </div>
  );
}

// ─── AuthorSidebarCard ────────────────────────────────────────────────────────

function AuthorSidebarCard({ author, authorName }) {
  const name = author?.name || authorName || "Ideas Estudio";
  const socialLinks = normalizeAuthorSocialLinks(author || {});

  return (
    <aside className="rounded-[28px] border border-[#e8e1d8] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col items-center text-center">
        <AuthorAvatar author={author || {}} />
        <h3 className="mt-4 text-xl font-semibold text-neutral-950">{name}</h3>
        {author?.short_description && (
          <p className="mt-2 text-sm leading-7 text-neutral-600">{author.short_description}</p>
        )}
        {socialLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {socialLinks.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black transition"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── AuthorFooterCard ─────────────────────────────────────────────────────────

function AuthorFooterCard({ author, authorName }) {
  const name = author?.name || authorName || "Ideas Estudio";
  const socialLinks = normalizeAuthorSocialLinks(author || {});

  return (
    <section className="rounded-[30px] border border-[#e8e1d8] bg-white p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-[96px_1fr] md:items-center">
        <AuthorAvatar author={author || {}} size="lg" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Autor del artículo</p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-950">{name}</h3>
          {author?.short_description && (
            <p className="mt-2 text-sm font-medium text-neutral-700">{author.short_description}</p>
          )}
          {author?.bio && (
            <p className="mt-4 max-w-3xl text-[15px] leading-8 text-neutral-600">{author.bio}</p>
          )}
          {socialLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black transition"
                >
                  {item.label}
                </a>
              ))}
            </div>
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

function normalizeGalleryImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter(Boolean)
    .map((img) => ({
      ...img,
      url: img.url || img.src || img.image_url || "",
      alt: img.alt || "",
      caption: img.caption || "",
    }))
    .filter((img) => img.url);
}

function GallerySlideshow({ images, title, description, variant = "slideshow" }) {
  const [current, setCurrent] = useState(0);

  const safeImages = normalizeGalleryImages(images);

  useEffect(() => {
    if (safeImages.length > 0 && current >= safeImages.length) {
      setCurrent(0);
    }
  }, [current, safeImages.length]); // eslint-disable-line

  if (!safeImages.length) return null;

  const currentImage = safeImages[current] ?? safeImages[0];

  const prev = () => setCurrent((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setCurrent((i) => (i + 1) % safeImages.length);

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
          {safeImages.map((img, i) => (
            <div key={img.url + i} className="rounded-2xl overflow-hidden bg-slate-100">
              <div className="aspect-square overflow-hidden">
                <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
              </div>
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
          src={currentImage.url}
          alt={currentImage.alt || ""}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {safeImages.length > 1 && (
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
              {safeImages.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Caption for current image */}
      {currentImage.caption && (
        <p className="px-5 py-2 text-xs text-slate-500 italic text-center">{currentImage.caption}</p>
      )}
      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {safeImages.map((img, i) => (
            <button key={img.url + i} onClick={() => setCurrent(i)}
              className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={img.url} alt={img.alt || ""} className="h-16 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gallery grouping ─────────────────────────────────────────────────────────

function groupConsecutiveImagesAsGalleries(blocks = []) {
  const result = [];
  let buffer = [];

  function flush() {
    if (buffer.length >= 2) {
      result.push({
        type: "gallery",
        variant: "slideshow",
        images: buffer.map((block) => ({
          url: block.url || block.src || block.image_url || "",
          alt: block.alt || "",
          caption: block.caption || undefined,
        })).filter((img) => img.url),
      });
    } else if (buffer.length === 1) {
      result.push(buffer[0]);
    }
    buffer = [];
  }

  for (const block of blocks) {
    if (block?.type === "image" && (block.url || block.src || block.image_url)) {
      buffer.push(block);
    } else {
      flush();
      result.push(block);
    }
  }
  flush();
  return result;
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
  const normalizedBlocks = normalizeLegacyBlocks(rawBlocks);
  const blocks = groupConsecutiveImagesAsGalleries(normalizedBlocks);
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
        <div className="aspect-square overflow-hidden rounded-[24px] bg-slate-100">
          <img
            src={image}
            alt={post?.featured_image_alt || post?.title || "Artículo"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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

// ─── BlogComments ─────────────────────────────────────────────────────────────

function getCommentErrorMessage(err) {
  if (!err) return "No se pudo enviar el comentario. Inténtalo nuevamente.";
  if (typeof err === "string") return err;
  if (err.message && typeof err.message === "string" && err.message !== "[object Object]") return err.message;
  if (Array.isArray(err.detail))
    return err.detail.map((d) => d?.msg || d?.message || String(d)).filter(Boolean).join(" ") ||
      "No se pudo enviar el comentario.";
  if (typeof err.detail === "string") return err.detail;
  if (err.error && typeof err.error === "string") return err.error;
  return "No se pudo enviar el comentario. Revisa la información e inténtalo nuevamente.";
}

function BlogComments({ slug }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", website: "", content: "", honeypot: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getBlogComments(slug)
      .then((res) => setComments(res?.items || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.honeypot) return;
    setSubmitting(true);
    setError("");
    try {
      await submitBlogComment(slug, {
        name: form.name,
        email: form.email,
        website: form.website,
        content: form.content,
        honeypot: form.honeypot,
      });
      setSubmitted(true);
      setForm({ name: "", email: "", website: "", content: "", honeypot: "" });
    } catch (err) {
      setError(getCommentErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-10 lg:p-12">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-10 border-b border-slate-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Conversación
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Deja tu comentario
        </h2>
        <div className="mt-3 h-1 w-14 rounded-full bg-slate-900" />
        <p className="mt-4 text-sm text-slate-400">
          Tu correo no se publicará. Los campos marcados con{" "}
          <span className="text-rose-400">*</span> son requeridos.
        </p>
      </div>

      {/* ── Approved comments ─────────────────────────────────────── */}
      {loading && (
        <p className="mb-8 text-sm text-slate-400">Cargando comentarios…</p>
      )}

      {!loading && comments.length === 0 && (
        <p className="mb-10 text-sm text-slate-400">
          Aún no hay comentarios. Sé la primera persona en compartir tu opinión.
        </p>
      )}

      {!loading && comments.length > 0 && (
        <div className="mb-10 space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2cc3d] text-sm font-bold text-black">
                {(c.author_name || "?")?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {c.author_name || "Anónimo"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Success state ─────────────────────────────────────────── */}
      {submitted ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-sm text-emerald-700">
            Tu comentario fue enviado y está pendiente de aprobación. ¡Gracias por participar!
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800 transition-colors"
          >
            Añadir otro comentario
          </button>
        </div>
      ) : (
        /* ── Comment form ─────────────────────────────────────────── */
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Honeypot — hidden from users */}
          <input
            type="text"
            name="honeypot"
            value={form.honeypot}
            onChange={(e) => setForm((f) => ({ ...f, honeypot: e.target.value }))}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Textarea — main comment field */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Comentario <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={7}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Escribe tu comentario…"
              className="min-h-[200px] w-full resize-none rounded-[20px] border border-slate-200 bg-white px-6 py-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
            />
            <p className="mt-1.5 text-right text-[11px] text-slate-400">
              {form.content.length}/2000
            </p>
          </div>

          {/* Name + Email row */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nombre <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Tu nombre"
                className="h-14 w-full rounded-full border border-slate-200 bg-white px-6 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Tu email (no se publica)"
                className="h-14 w-full rounded-full border border-slate-200 bg-white px-6 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
              />
            </div>
          </div>

          {/* Website — only render if the form state includes it */}
          {"website" in form && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sitio web
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="Tu sitio web (opcional)"
                className="h-14 w-full rounded-full border border-slate-200 bg-white px-6 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm font-medium text-rose-500">
              {typeof error === "string" ? error : getCommentErrorMessage(error)}
            </p>
          )}

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#f2cc3d] px-10 text-base font-bold text-black transition hover:bg-[#f0d24a] focus:outline-none focus:ring-2 focus:ring-[#f2cc3d]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Enviar comentario"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ─── BlogArticleWidgets ───────────────────────────────────────────────────────
// Component definition preserved — sidebar now covers this data on desktop.

function BlogArticleWidgets({ currentSlug, categorySlug, categoryName }) {
  const [categories, setCategories] = useState([]);
  const [topPosts, setTopPosts] = useState([]);

  useEffect(() => {
    // Load categories
    getBlogCategories()
      .then((res) => setCategories(res?.items || []))
      .catch(() => {});

    // Load featured/recent posts (exclude current article)
    getBlogPosts({ limit: 5 })
      .then((res) => {
        const items = (res?.items || []).filter((p) => p.slug !== currentSlug);
        setTopPosts(items.slice(0, 4));
      })
      .catch(() => {});
  }, [currentSlug]); // eslint-disable-line

  if (categories.length === 0 && topPosts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-10">

      {/* Widget 1 — Categorías */}
      {categories.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
            Categorías
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  cat.slug === categorySlug
                    ? "bg-[#f2cc3d] text-black"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
                {cat.post_count > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">{cat.post_count}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Widget 2 — Artículos destacados */}
      {topPosts.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm sm:col-span-1 lg:col-span-2">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
            Artículos destacados
          </h3>
          <div className="space-y-3">
            {topPosts.map((p) => (
              <a
                key={p.id || p.slug}
                href={`/blog/${p.slug}`}
                className="flex items-center gap-3 group"
              >
                {p.featured_image_url ? (
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={p.featured_image_url}
                      alt={p.featured_image_alt || p.title || ""}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-[#f2cc3d]/20 flex items-center justify-center text-lg">
                    📝
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 group-hover:text-black transition-colors">
                    {p.title}
                  </p>
                  {p.category_name && (
                    <p className="text-xs text-slate-400 mt-0.5">{p.category_name}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
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

  // ── Sidebar & prev/next state ──
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [sidebarPosts, setSidebarPosts] = useState([]);
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);

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

  // ── Load sidebar data + prev/next ──
  useEffect(() => {
    if (!slug) return;
    Promise.all([
      getBlogCategories().catch(() => ({ items: [] })),
      getBlogPosts({ limit: 50 }).catch(() => ({ items: [] })),
    ]).then(([cats, posts]) => {
      setSidebarCategories(cats?.items || []);
      const allPosts = posts?.items || [];
      // Recent posts for sidebar (exclude current)
      setSidebarPosts(allPosts.filter((p) => p.slug !== slug).slice(0, 3));
      // Prev/Next
      const idx = allPosts.findIndex((p) => p.slug === slug);
      setPrevPost(idx > 0 ? allPosts[idx - 1] : null);
      setNextPost(idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null);
    });
  }, [slug]); // eslint-disable-line

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

      {/* ── A. HERO BREADCRUMB / META ── */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 md:px-6 md:pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <MetaLine items={[categoryLabel, articleDate, readingTime]} />
          {post.excerpt && (
            <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-8 text-neutral-500 md:text-[16px]">
              {post.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* ── B. HERO IMAGE — landscape 16:9 with category badge ── */}
      <section className="mx-auto max-w-6xl px-4 pb-10 md:px-6">
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 aspect-[16/9]">
          <img
            src={featuredImage}
            alt={post.featured_image_alt || post.title || ""}
            className="h-full w-full object-cover"
          />
          {post.category_name && (
            <span className="absolute top-3 left-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm">
              {post.category_name}
            </span>
          )}
        </div>
      </section>

      {/* ── C. TWO-COLUMN LAYOUT ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

          {/* LEFT — Article content */}
          <div className="min-w-0">

            {/* C1. Article header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-3">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {post.published_at && (
                  <span>{new Date(post.published_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}</span>
                )}
                {post.author_name && (
                  <><span>·</span><span>{post.author_name}</span></>
                )}
                {post.reading_time_minutes > 0 && (
                  <><span>·</span><span>{post.reading_time_minutes} min de lectura</span></>
                )}
              </div>
            </div>

            {/* C2. Article body */}
            <ArticleContent post={post} />

            {/* C3. Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 self-center">Tags</span>
                {tags.map((tag) => (
                  <a key={tag.slug} href={`/blog?tag=${tag.slug}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                    {tag.name}
                  </a>
                ))}
              </div>
            )}

            {/* C4. Social share */}
            <div className="flex items-center gap-3 mt-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compartir</span>
              {[
                { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`, bg: "bg-[#1877f2]" },
                { label: "Twitter", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(post.title || "")}`, bg: "bg-[#1da1f2]" },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className={`${s.bg} text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity`}>
                  {s.label}
                </a>
              ))}
            </div>

            {/* C5. Author card */}
            {post.author_name && (
              <div className="mt-10 flex gap-5 items-start p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <AuthorAvatar author={post.author || {}} post={post} />
                <div>
                  <p className="font-bold text-slate-900 mb-1">{post.author_name}</p>
                  {post.author_short_description && (
                    <p className="text-sm text-slate-500 leading-relaxed">{post.author_short_description}</p>
                  )}
                </div>
              </div>
            )}

            {/* C6. Prev/Next navigation */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              {prevPost && (
                <a href={`/blog/${prevPost.slug}`} className="group">
                  <p className="text-xs text-slate-400 mb-1">Artículo anterior</p>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-black transition-colors line-clamp-2">{prevPost.title}</p>
                </a>
              )}
              {nextPost && (
                <a href={`/blog/${nextPost.slug}`} className="group text-right ml-auto col-start-2">
                  <p className="text-xs text-slate-400 mb-1">Siguiente artículo</p>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-black transition-colors line-clamp-2">{nextPost.title}</p>
                </a>
              )}
            </div>

          </div>

          {/* RIGHT — Sticky sidebar */}
          <aside className="hidden lg:block space-y-6 sticky top-8">

            {/* Sidebar: Author widget */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Acerca del autor</p>
              <div className="flex justify-center mb-3">
                <AuthorAvatar author={post.author || {}} post={post} />
              </div>
              <p className="font-bold text-slate-900 mb-2">{post.author_name || post.author?.name || "Ideas Estudio"}</p>
              {(post.author_short_description || post.author?.short_description) && (
                <p className="text-xs text-slate-500 leading-relaxed">{post.author_short_description || post.author?.short_description}</p>
              )}
              {post.author && normalizeAuthorSocialLinks(post.author).length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {normalizeAuthorSocialLinks(post.author).map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black transition"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Categories */}
            {sidebarCategories.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Categorías</p>
                <div className="space-y-2">
                  {sidebarCategories.map((cat) => (
                    <a key={cat.id} href={`/blog?category=${cat.slug}`}
                      className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 group">
                      <span className="text-sm text-slate-700 group-hover:text-black transition-colors">{cat.name}</span>
                      <span className="text-xs text-slate-400">({cat.post_count || 0})</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar: Recent posts */}
            {sidebarPosts.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Artículos recientes</p>
                <div className="space-y-4">
                  {sidebarPosts.map((p) => (
                    <a key={p.slug} href={`/blog/${p.slug}`} className="flex gap-3 group">
                      <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                        {p.featured_image_url
                          ? <img src={p.featured_image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="h-full w-full bg-[#f2cc3d]/30" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-black transition-colors">{p.title}</p>
                        {p.author_name && <p className="text-xs text-slate-400 mt-1">{p.author_name}</p>}
                        {p.published_at && (
                          <p className="text-xs text-slate-400">{new Date(p.published_at).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" })}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar: Tags cloud */}
            {tags.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <a key={tag.slug} href={`/blog?tag=${tag.slug}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-[#f2cc3d] hover:text-black transition-colors">
                      {tag.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

          </aside>

        </div>
      </div>

      {/* ── D. RELATED ARTICLES — full width ── */}
      {related?.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">También te puede interesar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <a key={p.slug} href={`/blog/${p.slug}`} className="group block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  {p.featured_image_url
                    ? <img src={p.featured_image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="h-full w-full bg-[#f2cc3d]/20" />
                  }
                </div>
                {p.category_name && (
                  <div className="px-4 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.category_name}</span>
                  </div>
                )}
                <div className="p-4 pt-2">
                  <p className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-black mb-1">{p.title}</p>
                  {p.author_name && (
                    <p className="text-xs text-slate-400">{p.author_name} · {p.published_at ? new Date(p.published_at).toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── E. COMMENTS — full width, outside grid ── */}
      <div className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6 mb-16">
        <BlogComments slug={slug} />
      </div>

    </main>
  );
}
