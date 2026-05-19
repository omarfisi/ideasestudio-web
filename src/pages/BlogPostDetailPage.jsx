import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBlogPostBySlug, getBlogRelated, getBlogComments, submitBlogComment, getBlogCategories, getBlogPosts } from "@/lib/api.js";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/components/seo/schema.js";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import BlogVisualBlock from "@/components/blog/ArticleVisualBlocks.jsx";
import BlogNewsletterSection from "@/components/blog/BlogNewsletterSection.jsx";

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

const SOCIAL_ICONS = {
  website: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zM17.083 20.25l-12.728-16.5H6.67l12.728 16.5z" />
    </svg>
  ),
};

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

// ─── BlogQuoteBlock ───────────────────────────────────────────────────────────

function BlogQuoteBlock({ block }) {
  const text = block?.text || "";
  if (!text) return null;

  const author  = block?.author  || "";
  const source  = block?.source  || "";
  const variant = block?.variant || "editorial";
  const align   = block?.align   || "center";

  const isMinimal = variant === "minimal";
  const footer = [author, source].filter(Boolean).join(" · ");

  if (isMinimal) {
    return (
      <aside className={`relative my-10 border-l-4 border-[#f2cc3d] py-2 pl-6 ${align === "center" ? "" : ""}`}>
        <blockquote>
          <p className="text-xl leading-[1.5] text-slate-700 sm:text-2xl">{text}</p>
          {footer && (
            <footer className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{footer}</footer>
          )}
        </blockquote>
      </aside>
    );
  }

  return (
    <aside className="relative my-12 overflow-hidden rounded-[28px] border border-slate-100 bg-white px-6 py-10 shadow-sm sm:px-10 lg:px-14">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 top-0 select-none font-serif text-[9rem] leading-none text-slate-100"
      >
        &ldquo;
      </span>
      <blockquote className={`relative mx-auto ${align === "center" ? "max-w-3xl text-center" : "max-w-4xl text-left"}`}>
        <p className="text-2xl leading-[1.45] text-slate-800 sm:text-3xl lg:text-[2.1rem]">{text}</p>
        {footer && (
          <footer className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{footer}</footer>
        )}
      </blockquote>
    </aside>
  );
}

// ─── ContentBlock ─────────────────────────────────────────────────────────────

function ContentBlock({ block }) {
  if (!block || typeof block !== "object") return null;

  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3 className="mt-10 mb-2 text-xl font-bold leading-snug text-neutral-900 md:text-2xl">
          {block.text}
        </h3>
      ) : (
        <h2 className="mt-12 mb-3 text-2xl font-bold leading-snug text-neutral-950 md:text-3xl">
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
          className="mt-4 text-[16px] leading-7 text-neutral-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    case "quote":
      return <BlogQuoteBlock block={block} />;

    case "list":
      if (!Array.isArray(block.items) || !block.items.length) return null;
      return block.style === "ordered" ? (
        <ol className="mt-6 list-decimal space-y-2.5 pl-7 text-[16px] leading-8 text-neutral-700 marker:text-[#f2cc3d] marker:font-bold">
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ol>
      ) : (
        <ul className="mt-6 list-disc space-y-2.5 pl-7 text-[16px] leading-8 text-neutral-700 marker:text-[#f2cc3d]">
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
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

    case "visual_block":
      return <BlogVisualBlock block={block} />;

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

function GallerySlideshowImageFrame({ src, alt = "", className = "" }) {
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-slate-100 text-sm font-bold text-slate-400 ${className}`}>
        Sin imagen
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <img src={src} alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/10 to-black/30" />
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain object-center" />
      </div>
    </div>
  );
}

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
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
        <GallerySlideshowImageFrame
          src={currentImage.url}
          alt={currentImage.alt || ""}
          className="h-full w-full"
        />
        {safeImages.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur hover:bg-white transition-colors text-slate-800 font-bold">
              ‹
            </button>
            <button onClick={next}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur hover:bg-white transition-colors text-slate-800 font-bold">
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1.5">
              {safeImages.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${i === current ? "h-2.5 w-7 bg-white" : "h-2.5 w-2.5 bg-white/50"}`} />
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
        <div className="flex gap-2.5 overflow-x-auto border-t border-slate-100 bg-white px-4 py-4">
          {safeImages.map((img, i) => (
            <button key={img.url + i} type="button" onClick={() => setCurrent(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === current ? "border-blue-500 shadow-md" : "border-transparent opacity-60 hover:opacity-100 hover:border-slate-300"
              }`}>
              <img src={img.url} alt={img.alt || `Miniatura ${i + 1}`} className="h-full w-full object-cover object-top" />
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
        className={[
          "prose prose-lg max-w-none",
          "prose-headings:font-bold prose-headings:text-neutral-950 prose-headings:leading-snug",
          "prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-3 md:prose-h2:text-3xl",
          "prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-2 md:prose-h3:text-2xl",
          "prose-p:text-neutral-700 prose-p:leading-8 prose-p:mt-5",
          "prose-li:text-neutral-700 prose-li:leading-8",
          "prose-ul:marker:text-[#f2cc3d] prose-ol:marker:text-[#f2cc3d] prose-ol:marker:font-bold",
          "prose-a:text-[#b38f00] prose-a:underline hover:prose-a:text-black",
          "prose-strong:text-neutral-900",
          "prose-blockquote:border-l-4 prose-blockquote:border-[#f2cc3d] prose-blockquote:text-neutral-700",
          "prose-blockquote:bg-white prose-blockquote:rounded-r-2xl prose-blockquote:py-3 prose-blockquote:pr-4",
          "prose-img:rounded-[24px] prose-img:shadow-sm",
        ].join(" ")}
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

// ─── RelatedPostsSection ─────────────────────────────────────────────────────

function RelatedPostsSection({ posts = [] }) {
  const visiblePosts = Array.isArray(posts)
    ? posts.filter((post) => post?.slug).slice(0, 3)
    : [];

  if (!visiblePosts.length) return null;

  return (
    <section className="mx-auto mt-20 max-w-6xl border-t border-slate-100 px-4 pt-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
          Sigue leyendo
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          Artículos relacionados
        </h2>
      </div>

      <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3">
        {visiblePosts.map((post) => {
          const image =
            post.featured_image_url ||
            post.cover_url ||
            post.image_url ||
            post.og_image_url ||
            "";
          const title = post.title || "Artículo";
          const href = `/blog/${post.slug}`;
          const date = post.published_at || post.created_at || "";
          const formattedDate = date
            ? new Date(date).toLocaleDateString("es-PR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "";
          const category = post.category_name || post.category?.name || "Blog";

          return (
            <article
              key={post.slug}
              className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)]"
            >
              <a href={href} className="block">
                <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                      Ideas Estudio
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-950">
                    {category}
                  </p>
                  <h3 className="mt-3 line-clamp-2 text-xl font-black leading-tight tracking-tight text-slate-950">
                    {title}
                  </h3>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-400">
                    {post.author_name && <span>{post.author_name}</span>}
                    {post.author_name && formattedDate && <span>·</span>}
                    {formattedDate && <span>{formattedDate}</span>}
                  </div>
                </div>
              </a>
            </article>
          );
        })}
      </div>
    </section>
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Conversación
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Deja tu comentario
        </h2>
        <div className="mt-3 h-1 w-14 rounded-full bg-slate-900" />
        <p className="mt-4 text-sm text-slate-600">
          Tu correo no se publicará. Los campos marcados con{" "}
          <span className="text-rose-400">*</span> son requeridos.
        </p>
      </div>

      {/* ── Approved comments ─────────────────────────────────────── */}
      {loading && (
        <p className="mb-8 text-base text-slate-600">Cargando comentarios…</p>
      )}

      {!loading && comments.length === 0 && (
        <p className="mb-10 text-lg font-medium text-slate-700">
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
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-slate-700">
              Comentario <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={7}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Escribe tu comentario…"
              className="min-h-[260px] w-full resize-none rounded-[28px] border border-slate-200 bg-white px-7 py-6 text-lg leading-8 text-slate-900 placeholder:text-slate-500 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
            />
            <p className="mt-1.5 text-right text-sm font-semibold text-slate-500">
              {form.content.length}/2000
            </p>
          </div>

          {/* Name + Email row */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                Nombre <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Tu nombre"
                className="h-16 w-full rounded-full border border-slate-200 bg-white px-7 text-lg font-semibold text-slate-900 placeholder:text-slate-500 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Tu email (no se publica)"
                className="h-16 w-full rounded-full border border-slate-200 bg-white px-7 text-lg font-semibold text-slate-900 placeholder:text-slate-500 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
              />
            </div>
          </div>

          {/* Website — only render if the form state includes it */}
          {"website" in form && (
            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                Sitio web
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="Tu sitio web (opcional)"
                className="h-16 w-full rounded-full border border-slate-200 bg-white px-7 text-lg font-semibold text-slate-900 placeholder:text-slate-500 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 transition-colors"
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

      {/* ── A. EDITORIAL HEADER ── */}
      <header className="mx-auto max-w-5xl px-4 pb-8 pt-14 text-center sm:px-6 md:pt-20">
        <MetaLine items={[categoryLabel, articleDate, readingTime]} />
        <h1 className="mx-auto mt-6 max-w-4xl text-balance text-[clamp(2.1rem,5vw,4.25rem)] font-black leading-[1.02] tracking-[-0.04em] text-slate-950">
          {post.title}
        </h1>
      </header>

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

            {/* C1. Editorial intro quote — omit if article already has a quote block */}
            {post.excerpt && !(Array.isArray(post.content_json) && post.content_json.some((b) => b?.type === "quote")) && (
              <BlogQuoteBlock
                block={{ text: post.excerpt, author: "Ideas Estudio", variant: "editorial", align: "center" }}
              />
            )}

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
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 mb-1">{post.author_name}</p>
                  {post.author_short_description && (
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">{post.author_short_description}</p>
                  )}
                  {(post.author?.bio || post.author_bio) && (
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{post.author?.bio || post.author_bio}</p>
                  )}
                  {post.author && normalizeAuthorSocialLinks(post.author).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizeAuthorSocialLinks(post.author).map((item) => (
                        <a
                          key={item.key}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.label}
                          title={item.label}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black transition [&_svg]:h-4 [&_svg]:w-4"
                        >
                          {SOCIAL_ICONS[item.key]}
                        </a>
                      ))}
                    </div>
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
                <p className="text-xs font-medium text-slate-600 leading-relaxed">{post.author_short_description || post.author?.short_description}</p>
              )}
              {(post.author?.bio || post.author_bio) && (
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{post.author?.bio || post.author_bio}</p>
              )}
              {post.author && normalizeAuthorSocialLinks(post.author).length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {normalizeAuthorSocialLinks(post.author).map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      title={item.label}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black transition [&_svg]:h-4 [&_svg]:w-4"
                    >
                      {SOCIAL_ICONS[item.key]}
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

      {/* ── D. NEWSLETTER ── */}
      <BlogNewsletterSection
        title="¿Quieres recibir más ideas como esta?"
        description="Suscríbete para recibir estrategias de marca, contenido y presencia digital para impulsar tu negocio."
      />

      {/* ── E. RELATED ARTICLES — full width ── */}
      <RelatedPostsSection
        posts={(related?.length ? related : sidebarPosts || []).filter(
          (item) => item?.slug && item.slug !== slug
        )}
      />

      {/* ── E. COMMENTS — full width, outside grid ── */}
      <div className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6 mb-16">
        <BlogComments slug={slug} />
      </div>

    </main>
  );
}
