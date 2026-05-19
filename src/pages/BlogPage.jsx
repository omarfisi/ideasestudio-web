import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getBlogHome, getBlogPosts } from "@/lib/api.js";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import BlogNewsletterSection from "@/components/blog/BlogNewsletterSection.jsx";


const POSTS_PER_PAGE = 9;


// ─── Helpers para normalizar artículos del API ───────────────────────────────
function getAuthorAvatar(post = {}) {
  return (
    post.author_avatar ||
    post.author_avatar_url ||
    post.author_image_url ||
    post.author?.avatar_url ||
    post.author?.image_url ||
    ""
  );
}

function postToCard(post) {
  if (!post) return null;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.category_name || "Blog",
    meta: post.reading_time_minutes ? `${post.reading_time_minutes} min` : "Lectura",
    image: post.featured_image_url || "",
    author: post.author_name || post.author?.name || "Ideas Estudio",
    author_avatar: getAuthorAvatar(post),
    date: post.published_at ? new Date(post.published_at).toLocaleDateString("es", { month: "long", year: "numeric" }) : "",
    is_featured: post.is_featured,
  };
}

// ─── Frame de imagen editorial (blur bg + object-contain) ────────────────────
function EditorialImageFrame({ src, alt = "", className = "", imageClassName = "" }) {
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-neutral-100 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400 ${className}`}>
        Ideas Estudio
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-neutral-950 ${className}`}>
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
      <img src={src} alt={alt} className={`relative z-10 h-full w-full object-contain ${imageClassName}`} />
    </div>
  );
}

// ─── Componentes visuales ─────────────────────────────────────────────────────
function MetaLine({ category, meta }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
      <span>{category}</span>
      <span className="h-1 w-1 rounded-full bg-neutral-400" />
      <span>{meta}</span>
    </div>
  );
}

function AuthorRow({ author = "Ideas Estudio", avatarUrl = "", date }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#f2cc3d]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={author} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-black">
            {(author || "A")[0].toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{author}</p>
        {date && <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{date}</p>}
      </div>
    </div>
  );
}

function Badge({ text }) {
  return (
    <span className="absolute left-3 top-3 z-10 bg-[#f2cc3d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
      {text}
    </span>
  );
}

function ReadButton({ onClick, className = "" }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`mt-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d] ${className}`}
    >
      Leer artículo
      <span className="text-[14px]">→</span>
    </button>
  );
}

function SmallPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-[20px]">
        {post.is_featured && <Badge text="Destacado" />}
        <EditorialImageFrame
          src={post.image}
          alt={post.title}
          className="h-[230px] transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-[20px] font-semibold leading-[1.15] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
        <ReadButton onClick={onClick} />
      </div>
    </article>
  );
}

function MiniPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="overflow-hidden rounded-[16px]">
        <EditorialImageFrame
          src={post.image}
          alt={post.title}
          className="h-[200px] transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-lg font-semibold leading-[1.2] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
        <ReadButton onClick={onClick} />
      </div>
    </article>
  );
}

function EditorialFeature({ post, onClick }) {
  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-[24px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] lg:grid lg:grid-cols-[1.05fr_0.95fr]"
      onClick={onClick}
    >
      <EditorialImageFrame
        src={post.image}
        alt={post.title}
        className="min-h-[340px]"
        imageClassName="transition duration-500 group-hover:scale-[1.02]"
      />
      <div className="flex items-center p-8 lg:p-10">
        <div>
          <MetaLine category={post.category} meta={post.meta} />
          <h2 className="mt-4 text-3xl font-semibold leading-[1.05] text-neutral-950 lg:text-4xl">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-5 text-[15px] leading-8 text-neutral-600">{post.excerpt}</p>
          )}
          <div className="mt-8">
            <AuthorRow author={post.author} avatarUrl={post.author_avatar} date={post.date} />
          </div>
          <ReadButton onClick={onClick} />
        </div>
      </div>
    </article>
  );
}

function LatestPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="overflow-hidden rounded-[20px]">
        <EditorialImageFrame
          src={post.image}
          alt={post.title}
          className="h-[220px] transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-[20px] font-semibold leading-[1.15] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
        <div className="mt-4">
          <AuthorRow author={post.author} avatarUrl={post.author_avatar} date={post.date} />
        </div>
        <ReadButton onClick={onClick} />
      </div>
    </article>
  );
}

function BlogFilterBar({ categories = [], activeCategory = "", searchQuery = "", onCategoryChange, onSearchChange, onClear }) {
  const cats = Array.isArray(categories) ? categories.filter((c) => c?.name) : [];

  return (
    <div className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.05)] md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">Explora el blog</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-3xl">
            Busca por tema o palabra clave
          </h2>
        </div>
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar artículos..."
            className="h-13 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 pr-12 text-[15px] font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f2cc3d] focus:bg-white focus:ring-4 focus:ring-[#f2cc3d]/20"
          />
          {searchQuery ? (
            <button type="button" onClick={() => onSearchChange("")} aria-label="Limpiar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400 transition hover:text-neutral-900">
              ×
            </button>
          ) : (
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">🔎</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onCategoryChange("")}
          className={!activeCategory
            ? "rounded-full bg-[#f2cc3d] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_4px_16px_rgba(242,204,61,0.3)]"
            : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d]/10 hover:text-neutral-900"}>
          Todos
        </button>
        {cats.map((cat) => (
          <button key={cat.slug} type="button" onClick={() => onCategoryChange(cat.slug)}
            className={activeCategory === cat.slug
              ? "rounded-full bg-[#f2cc3d] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_4px_16px_rgba(242,204,61,0.3)]"
              : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d]/10 hover:text-neutral-900"}>
            {cat.name}
          </button>
        ))}
        {(activeCategory || searchQuery) && (
          <button type="button" onClick={onClear}
            className="rounded-full border border-neutral-200 bg-neutral-950 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#f2cc3d] hover:text-black">
            Limpiar filtros ×
          </button>
        )}
      </div>
    </div>
  );
}

function BlogHeroSlideshow({ posts = [], onNavigate }) {
  const slides = posts.filter((p) => p?.slug).slice(0, 6);
  const [current, setCurrent] = useState(0);

  if (!slides.length) return null;

  const idx = Math.min(current, slides.length - 1);
  const post = slides[idx];

  function goPrev() { setCurrent((i) => (i === 0 ? slides.length - 1 : i - 1)); }
  function goNext() { setCurrent((i) => (i === slides.length - 1 ? 0 : i + 1)); }

  return (
    <div className="mt-10 overflow-hidden rounded-[36px] border border-neutral-200 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.07)]">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        {/* Image column */}
        <button type="button" className="block w-full text-left" onClick={() => onNavigate?.(post.slug)}>
          <EditorialImageFrame
            src={post.image}
            alt={post.title}
            className="aspect-[16/11] h-full min-h-[360px] w-full lg:aspect-auto lg:min-h-[540px]"
            imageClassName="transition duration-500 hover:scale-[1.015]"
          />
        </button>

        {/* Text column */}
        <div className="flex min-h-[420px] flex-col justify-center p-8 md:p-12">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
            <span>{post.category}</span>
            <span className="h-1 w-1 rounded-full bg-neutral-400" />
            <span>{post.meta}</span>
          </div>

          <h2
            className="max-w-lg cursor-pointer text-3xl font-semibold leading-[1.05] tracking-[-0.025em] text-neutral-950 transition hover:text-neutral-600 md:text-4xl"
            onClick={() => onNavigate?.(post.slug)}
          >
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-neutral-600">{post.excerpt}</p>
          )}

          <div className="mt-7">
            <AuthorRow author={post.author} avatarUrl={post.author_avatar} date={post.date} />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.(post.slug)}
              className="inline-flex items-center gap-2 rounded-full bg-[#f2cc3d] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
            >
              Leer artículo <span>→</span>
            </button>

            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Artículo anterior"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white text-base text-neutral-600 transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d]"
                >←</button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Artículo siguiente"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white text-base text-neutral-600 transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d]"
                >→</button>
              </div>
            )}
          </div>

          {slides.length > 1 && (
            <div className="mt-6 flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Ver artículo ${i + 1}`}
                  className={
                    i === idx
                      ? "h-2 w-8 rounded-full bg-[#f2cc3d] transition-all duration-300"
                      : "h-2 w-2 rounded-full bg-neutral-300 transition-all duration-300 hover:bg-neutral-500"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlogPagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const raw = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) raw.push(i);
  }
  const items = [];
  let prev = 0;
  for (const p of raw) {
    if (prev && p - prev > 1) items.push("…");
    items.push(p);
    prev = p;
  }

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d] disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} className={btnBase}>
        <span>←</span> Anterior
      </button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={i} className="px-1 text-sm text-neutral-400">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            className={`h-9 w-9 rounded-full text-sm font-bold transition ${
              item === page
                ? "bg-[#f2cc3d] text-black"
                : "border border-black/15 bg-white text-neutral-600 hover:border-[#f2cc3d] hover:bg-[#f2cc3d] hover:text-black"
            }`}
          >
            {item}
          </button>
        )
      )}
      <button type="button" disabled={page === totalPages} onClick={() => onPage(page + 1)} className={btnBase}>
        Siguiente <span>→</span>
      </button>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="my-14"
      style={{
        height: "1px",
        background:
          "linear-gradient(90deg, rgba(17,17,17,0) 0%, rgba(17,17,17,0.06) 18%, rgba(17,17,17,0.14) 50%, rgba(17,17,17,0.06) 82%, rgba(17,17,17,0) 100%)",
      }}
    />
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BlogPage() {
  const pageSeo = usePageSeo();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const allPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const activeCategory = searchParams.get("category") || "";
  const searchQuery = searchParams.get("q") || "";

  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchQueryRef = useRef(searchQuery);

  const [allPosts, setAllPosts] = useState([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allLoading, setAllLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getBlogHome().catch(() => null).then((res) => {
      if (!alive) return;
      setLayout(res || null);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Sync searchInput when URL changes externally (back/forward navigation)
  useEffect(() => {
    if (searchQuery !== searchQueryRef.current) {
      searchQueryRef.current = searchQuery;
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  // Debounce: push searchInput → URL after 350 ms
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== searchQuery) {
        updateBlogFilters({ q: searchInput });
      }
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setAllLoading(true);
    getBlogPosts({
      limit: POSTS_PER_PAGE,
      page: allPage,
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(searchQuery ? { search: searchQuery } : {}),
    })
      .then((res) => {
        if (!alive) return;
        setAllPosts((res?.items || []).map(postToCard).filter(Boolean));
        setAllTotal(res?.total || 0);
      })
      .catch(() => {})
      .finally(() => { if (alive) setAllLoading(false); });
    return () => { alive = false; };
  }, [allPage, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(allTotal / POSTS_PER_PAGE));

  function updateBlogFilters(next) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (Object.prototype.hasOwnProperty.call(next, "category")) {
        if (next.category) params.set("category", next.category);
        else params.delete("category");
        params.delete("page");
      }
      if (Object.prototype.hasOwnProperty.call(next, "q")) {
        const q = (next.q || "").trim();
        if (q) params.set("q", q);
        else params.delete("q");
        params.delete("page");
      }
      return params;
    });
  }

  function handleCategoryChange(slug) { updateBlogFilters({ category: slug }); }
  function handleSearchChange(value) { setSearchInput(value); }
  function handleClearFilters() {
    setSearchInput("");
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("category"); p.delete("q"); p.delete("page");
      return p;
    });
  }

  function handlePageChange(n) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (n <= 1) p.delete("page"); else p.set("page", String(n));
      return p;
    });
    document.getElementById("todos-articulos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goPost(slug) {
    if (slug) navigate(`/blog/${slug}`);
  }

  // Datos del API o fallback
  const heroMain = layout?.hero_main ? postToCard(layout.hero_main) : null;
  const heroSide = layout?.hero_side ? postToCard(layout.hero_side) : null;
  const topGrid = (layout?.top_grid || []).map(postToCard).filter(Boolean);
  const featureMain = layout?.feature_main ? postToCard(layout.feature_main) : null;
  const magazineLeft = (layout?.magazine_left || []).map(postToCard).filter(Boolean);
  const magazineCenter = layout?.magazine_center ? postToCard(layout.magazine_center) : null;
  const magazineRight = (layout?.magazine_right || []).map(postToCard).filter(Boolean);
  const recentPosts = (layout?.recent_posts || []).map(postToCard).filter(Boolean);
  const categories = layout?.categories || [];

  const heroSlides = (() => {
    const seen = new Set();
    return [heroMain, heroSide, ...topGrid, featureMain, ...recentPosts].filter((post) => {
      if (!post?.slug || seen.has(post.slug)) return false;
      seen.add(post.slug);
      return true;
    });
  })();


  return (
    <main className="bg-white text-neutral-950">
      <SEOHead
        title="Blog | Ideas Estudio"
        description="Artículos sobre fotografía, diseño, branding y creatividad para marcas y negocios en Puerto Rico."
        canonical="https://ideasestudio.com/blog"
        seoEntry={pageSeo}
      />
      <div className="mx-auto max-w-[1220px] px-4 pb-20 pt-10 md:px-6 md:pb-28 md:pt-16">

        {/* ── HERO ── */}
        <section>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
              Blog / Ideas Estudio
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.03em] md:text-6xl">
              Artículos con <span className="highlight-box-glow">estrategias</span> para generar más ventas, visitas y prospectos.
            </h1>
            <p className="mt-6 text-[15px] leading-8 text-neutral-600 md:text-[17px]">
              Explora artículos con ideas, estrategias y recomendaciones para generar más visitas, captar mejores prospectos y aumentar tus ventas.
            </p>
          </div>

          <Divider />

          {/* Filtros de búsqueda y categorías */}
          <BlogFilterBar
            categories={categories}
            activeCategory={activeCategory}
            searchQuery={searchInput}
            onCategoryChange={handleCategoryChange}
            onSearchChange={handleSearchChange}
            onClear={handleClearFilters}
          />

          <Divider />

          {/* Slideshow hero principal */}
          {loading ? (
            <div className="mt-10 animate-pulse overflow-hidden rounded-[36px] bg-neutral-100 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
              <div className="min-h-[360px] bg-neutral-200 lg:min-h-[540px]" />
              <div className="flex items-center p-8 lg:p-12">
                <div className="w-full space-y-4">
                  <div className="h-3 w-24 rounded bg-neutral-200" />
                  <div className="h-8 w-full rounded bg-neutral-200" />
                  <div className="h-8 w-3/4 rounded bg-neutral-200" />
                  <div className="h-4 w-full rounded bg-neutral-200" />
                  <div className="h-4 w-2/3 rounded bg-neutral-200" />
                </div>
              </div>
            </div>
          ) : heroSlides.length > 0 ? (
            <BlogHeroSlideshow posts={heroSlides} onNavigate={goPost} />
          ) : (
            <div className="mt-10 rounded-[28px] border border-dashed border-neutral-200 py-20 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">Blog</p>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-700">No hay artículos publicados todavía.</h2>
              <p className="mt-3 text-[15px] text-neutral-400">
                Cuando publiques artículos desde el sistema editorial, aparecerán aquí.
              </p>
            </div>
          )}
        </section>


        <Divider />

        {/* ── TOP GRID 4 ── */}
        {(topGrid.length > 0 || loading) && (
          <section className="mt-0 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="h-[230px] w-full rounded-[20px] bg-neutral-100" />
                    <div className="h-3 w-1/3 rounded bg-neutral-100" />
                    <div className="h-5 w-full rounded bg-neutral-100" />
                  </div>
                ))
              : topGrid.map((post) => (
                  <SmallPostCard key={post.id} post={post} onClick={() => goPost(post.slug)} />
                ))}
          </section>
        )}

        <Divider />

        {/* ── FEATURE SPLIT ── */}
        {(featureMain || (!loading && heroSide)) && (
          <section className="mt-0">
            <EditorialFeature
              post={featureMain || heroSide}
              onClick={() => goPost((featureMain || heroSide)?.slug)}
            />
          </section>
        )}

        <Divider />

        {/* ── TODOS LOS ARTÍCULOS ── */}
        <section id="todos-articulos" className="mt-0 scroll-mt-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Archivo</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">
                {activeCategory || searchQuery ? "Resultados" : "Todos los artículos"}
              </h2>
              {(activeCategory || searchQuery) && (
                <p className="mt-2 text-sm text-neutral-500">
                  {activeCategory && `Categoría: ${activeCategory}`}
                  {activeCategory && searchQuery && " · "}
                  {searchQuery && `"${searchQuery}"`}
                </p>
              )}
            </div>
            {!allLoading && (
              <p className="shrink-0 text-sm text-neutral-500">{allTotal} artículo{allTotal !== 1 ? "s" : ""}</p>
            )}
          </div>

          {allLoading ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-[220px] w-full rounded-[20px] bg-neutral-100" />
                  <div className="h-3 w-1/3 rounded bg-neutral-100" />
                  <div className="h-5 w-full rounded bg-neutral-100" />
                  <div className="h-4 w-2/3 rounded bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : allPosts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base font-semibold text-neutral-700">No encontramos artículos con esos filtros.</p>
              <button type="button" onClick={handleClearFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:border-[#f2cc3d] hover:bg-[#f2cc3d]">
                Limpiar filtros ×
              </button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {allPosts.map((post) => (
                <LatestPostCard key={post.id} post={post} onClick={() => goPost(post.slug)} />
              ))}
            </div>
          )}

          <BlogPagination page={allPage} totalPages={totalPages} onPage={handlePageChange} />
        </section>

        <Divider />

        {/* ── NEWSLETTER ── */}
        <BlogNewsletterSection
          title="Recibe ideas para hacer crecer tu marca."
          description="Contenido práctico sobre branding, páginas web, contenido visual y estrategias digitales para negocios."
        />

        <Divider />

        {/* ── MAGAZINE MIX ── */}
        {(magazineLeft.length > 0 || magazineCenter || magazineRight.length > 0) && (
          <section className="mt-0 grid gap-8 xl:grid-cols-[0.8fr_1.4fr_0.8fr]">
            <div className="space-y-8">
              {magazineLeft.map((post) => (
                <MiniPostCard key={post.id} post={post} onClick={() => goPost(post.slug)} />
              ))}
            </div>

            {magazineCenter && (
              <article
                className="group cursor-pointer overflow-hidden rounded-[24px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
                onClick={() => goPost(magazineCenter.slug)}
              >
                <EditorialImageFrame
                  src={magazineCenter.image}
                  alt={magazineCenter.title}
                  className="h-[340px] transition duration-500 group-hover:scale-[1.02] md:h-[420px]"
                />
                <div className="p-8 lg:p-10">
                  <MetaLine category={magazineCenter.category} meta={magazineCenter.meta} />
                  <h2 className="mt-4 text-3xl font-semibold leading-[1.05] text-neutral-950 lg:text-4xl">
                    {magazineCenter.title}
                  </h2>
                  {magazineCenter.excerpt && (
                    <p className="mt-5 text-[15px] leading-7 text-neutral-600">
                      {magazineCenter.excerpt}
                    </p>
                  )}
                  <div className="mt-7">
                    <AuthorRow author={magazineCenter.author} avatarUrl={magazineCenter.author_avatar} date={magazineCenter.date} />
                  </div>
                  <ReadButton onClick={() => goPost(magazineCenter.slug)} />
                </div>
              </article>
            )}

            <div className="space-y-8">
              {magazineRight.map((post) => (
                <MiniPostCard key={post.id} post={post} onClick={() => goPost(post.slug)} />
              ))}
            </div>
          </section>
        )}

        <Divider />

        {/* ── CTA STRIP ── */}
        <section className="mt-0 rounded-[24px] bg-black px-8 py-12 text-center md:px-12">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">
            <span className="highlight-box-glow">Ideas Estudio</span> Blog
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/70">
            Artículos sobre branding, web, marketing digital, contenido, fotografía y video para negocios que quieren comunicar mejor.
          </p>
          <button
            className="mt-6 rounded-full bg-[#f2cc3d] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-black transition hover:bg-white"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Explorar artículos
          </button>
        </section>

        <Divider />

        {/* ── ÚLTIMOS ARTÍCULOS ── */}
        {recentPosts.length > 0 && (
          <section className="mt-0">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                  Últimos artículos
                </p>
                <h2 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">
                  Publicaciones recientes
                </h2>
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              {recentPosts.map((post) => (
                <LatestPostCard key={post.id} post={post} onClick={() => goPost(post.slug)} />
              ))}
            </div>
          </section>
        )}


      </div>
    </main>
  );
}
