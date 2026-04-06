import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBlogHome } from "@/lib/api.js";

// ─── Fallback mock (se usa solo cuando no hay artículos en la API) ───────────
const FALLBACK_HERO = {
  category: "Blog / Destacado",
  readTime: "5 min de lectura",
  title: "Contenido que conecta, posiciona y convierte mejor.",
  excerpt:
    "Explora artículos sobre diseño web, redes sociales, branding, contenido y estrategias digitales pensadas para negocios que quieren crecer con claridad.",
  author: "Ideas Estudio",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80",
};

const instagramPosts = [
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
];

// ─── Helpers para normalizar artículos del API ───────────────────────────────
function postToCard(post) {
  if (!post) return null;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.category_name || "Blog",
    meta: post.reading_time_minutes ? `${post.reading_time_minutes} min` : "Lectura",
    image: post.featured_image_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80",
    author: post.author_name || "Ideas Estudio",
    date: post.published_at ? new Date(post.published_at).toLocaleDateString("es", { month: "long", year: "numeric" }) : "",
    is_featured: post.is_featured,
  };
}

// ─── Componentes visuales (idénticos al diseño original) ─────────────────────
function MetaLine({ category, meta }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
      <span>{category}</span>
      <span className="h-1 w-1 rounded-full bg-neutral-400" />
      <span>{meta}</span>
    </div>
  );
}

function AuthorRow({ author = "Ideas Estudio", date }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f2cc3d]">
        <img
          src="https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp"
          alt={author}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
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

function SmallPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-[20px] bg-white">
        {post.is_featured && <Badge text="Destacado" />}
        <img
          src={post.image}
          alt={post.title}
          className="h-[230px] w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-[20px] font-semibold leading-[1.15] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
      </div>
    </article>
  );
}

function MiniPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-[16px] bg-white">
        <img
          src={post.image}
          alt={post.title}
          className="h-[200px] w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-lg font-semibold leading-[1.2] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
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
      <div className="overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="h-full min-h-[340px] w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
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
            <AuthorRow author={post.author} date={post.date} />
          </div>
        </div>
      </div>
    </article>
  );
}

function LatestPostCard({ post, onClick }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-[20px] bg-white">
        <img
          src={post.image}
          alt={post.title}
          className="h-[220px] w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="pt-4">
        <MetaLine category={post.category} meta={post.meta} />
        <h3 className="mt-3 text-[20px] font-semibold leading-[1.15] text-neutral-950 transition group-hover:text-black/70">
          {post.title}
        </h3>
        <div className="mt-4">
          <AuthorRow author={post.author} date={post.date} />
        </div>
      </div>
    </article>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BlogPage() {
  const navigate = useNavigate();
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    getBlogHome()
      .then((res) => { if (!cancelled) setLayout(res); })
      .catch((err) => { console.error("[BlogPage] getBlogHome error:", err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
  const categories = (layout?.categories || []).map((c) => c.name);

  const topicsDisplay = categories.length > 0
    ? categories
    : ["Branding", "Diseño Web", "Contenido", "Fotografía", "Video", "SEO", "Marketing Digital"];

  // Hero: solo usa fallback si no hay datos del API después de cargar
  const displayHero = heroMain || (!loading ? FALLBACK_HERO : null);

  return (
    <main className="bg-white text-neutral-950">
      <div className="mx-auto max-w-[1220px] px-4 pb-20 pt-10 md:px-6 md:pb-28 md:pt-16">

        {/* ── HERO ── */}
        <section>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
              Blog / Ideas Estudio
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.03em] md:text-6xl">
              Artículos para crecer con más <span className="highlight-box-glow">claridad.</span>
            </h1>
            <p className="mt-6 text-[15px] leading-8 text-neutral-600 md:text-[17px]">
              Diseño, contenido, branding, fotografía, video y estrategias digitales explicadas de una forma más visual, más clara y más útil para negocios reales.
            </p>
          </div>

          {/* Artículo hero principal */}
          {loading ? (
            <div className="mt-10 animate-pulse overflow-hidden rounded-[28px] bg-neutral-100 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="min-h-[360px] bg-neutral-200" />
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
          ) : displayHero ? (
            <article
              className="group mt-10 cursor-pointer overflow-hidden rounded-[28px] bg-neutral-50 shadow-[0_12px_40px_rgba(0,0,0,0.06)] lg:grid lg:grid-cols-[1.1fr_0.9fr]"
              onClick={() => heroMain && goPost(heroMain.slug)}
            >
              <div className="overflow-hidden">
                <img
                  src={displayHero.image || displayHero.featured_image_url}
                  alt={displayHero.title}
                  className="h-full min-h-[360px] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center p-8 lg:p-12">
                <div>
                  <MetaLine
                    category={displayHero.category || displayHero.category_name || "Blog"}
                    meta={displayHero.readTime || displayHero.meta || "Lectura"}
                  />
                  <h2 className="mt-4 text-3xl font-semibold leading-[1.05] text-neutral-950 lg:text-4xl">
                    {displayHero.title}
                  </h2>
                  <p className="mt-5 text-[15px] leading-7 text-neutral-600">
                    {displayHero.excerpt}
                  </p>
                  <div className="mt-8">
                    <AuthorRow
                      author={displayHero.author || displayHero.author_name || "Ideas Estudio"}
                      date={displayHero.date}
                    />
                  </div>
                </div>
              </div>
            </article>
          ) : null}
        </section>

        {/* ── TOPICS / CATEGORÍAS ── */}
        <section className="mt-10 rounded-[20px] border border-neutral-200 py-7">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {topicsDisplay.map((t) => (
              <button
                key={t}
                type="button"
                className={`transition hover:text-black ${activeCategory === t ? "text-black" : ""}`}
                onClick={() => setActiveCategory(activeCategory === t ? "" : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* ── TOP GRID 4 ── */}
        {(topGrid.length > 0 || loading) && (
          <section className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
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

        {/* ── FEATURE SPLIT ── */}
        {(featureMain || (!loading && heroSide)) && (
          <section className="mt-14">
            <EditorialFeature
              post={featureMain || heroSide}
              onClick={() => goPost((featureMain || heroSide)?.slug)}
            />
          </section>
        )}

        {/* ── NEWSLETTER ── */}
        <section className="mt-12 rounded-[20px] bg-neutral-50 px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] md:px-8">
          <div className="grid items-center gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <div>
              <h3 className="text-xl font-semibold text-neutral-950">
                Recibe nuevos artículos y recursos
              </h3>
            </div>
            <input
              type="text"
              placeholder="Tu nombre"
              className="h-12 w-full rounded-[10px] border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black"
            />
            <input
              type="email"
              placeholder="Tu email"
              className="h-12 w-full rounded-[10px] border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black"
            />
            <button className="h-12 min-w-[160px] rounded-[10px] bg-black px-6 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#f2cc3d] hover:text-black">
              Suscribirme
            </button>
          </div>
        </section>

        {/* ── MAGAZINE MIX ── */}
        {(magazineLeft.length > 0 || magazineCenter || magazineRight.length > 0) && (
          <section className="mt-14 grid gap-8 xl:grid-cols-[0.8fr_1.4fr_0.8fr]">
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
                <div className="overflow-hidden">
                  <img
                    src={magazineCenter.image}
                    alt={magazineCenter.title}
                    className="h-[340px] w-full object-cover transition duration-500 group-hover:scale-105 md:h-[420px]"
                  />
                </div>
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
                    <AuthorRow author={magazineCenter.author} date={magazineCenter.date} />
                  </div>
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

        {/* ── CTA STRIP ── */}
        <section className="mt-14 rounded-[24px] bg-black px-8 py-12 text-center md:px-12">
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

        {/* ── ÚLTIMOS ARTÍCULOS ── */}
        {recentPosts.length > 0 && (
          <section className="mt-16">
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

        {/* ── INSTAGRAM ── */}
        <section className="mt-16">
          <div className="mb-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Redes</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">
              @ideasestudio en <span className="highlight-box-glow">Instagram</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {instagramPosts.map((image, index) => (
              <div key={index} className="group overflow-hidden rounded-[16px]">
                <img
                  src={image}
                  alt={`Instagram ${index + 1}`}
                  className="h-[170px] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
