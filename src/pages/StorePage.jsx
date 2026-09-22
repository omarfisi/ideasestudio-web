import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ShoppingCart } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ProductsGrid from "@/components/shared/ProductsGrid.jsx";
import CategorySection from "@/components/store/CategorySection.jsx";
import "@/components/store/ShopProductCard.css";
import "./JJPegaTestimonials.css";
import BlogNewsletterSection from "@/components/blog/BlogNewsletterSection.jsx";
import {
  getPublicProductCategories,
  getPublicProducts,
  getPublicTestimonials,
} from "@/lib/api.js";
const IS_JJ_PEGA = true;

const SORT_OPTIONS = [
  { value: "popular", label: "Más populares" },
  { value: "price_asc", label: "Precio menor" },
  { value: "price_desc", label: "Precio mayor" },
  { value: "name_asc", label: "Nombre A-Z" },
];

const SALE_MODE_LABELS = {
  buy_now: "Compra directa",
  deposit_booking: "Reserva",
  quote_only: "Propuesta",
};

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function toReadableLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getSegment(product) {
  const segment = product?.metadata?.commercial_segment || "";
  return String(segment || "").trim();
}

function getServiceType(product) {
  const value =
    product?.metadata?.service_type ||
    product?.metadata?.product_type ||
    product?.productType ||
    "";
  const normalized = normalize(value);
  return normalized === "service" ? "" : normalized;
}

function isFeatured(product) {
  return (
    product?.metadata?.is_featured === true ||
    product?.metadata?.featured === true ||
    product?.raw?.is_featured === true
  );
}

function getPopularityScore(product) {
  const value =
    product?.metadata?.popularity_score ??
    product?.metadata?.sales_count ??
    product?.metadata?.service_sort_order;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSaleModeLabel(product) {
  const mode = normalize(product?.metadata?.sale_mode);
  if (!mode) return "";
  return SALE_MODE_LABELS[mode] || toReadableLabel(mode);
}

function getReviewInitials(name) {
  return String(name || "Cliente")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function StorePage() {
  const pageSeo = usePageSeo();
  const loaderData = useLoaderData();
  const loaderFilters = loaderData?.filters || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(
    searchParams.get("q") || loaderFilters.search || ""
  );
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [publicTestimonials, setPublicTestimonials] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const productsRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getPublicTestimonials()
      .then((payload) => {
        if (cancelled) return;
        const rows = Array.isArray(payload) ? payload : payload?.items;
        if (Array.isArray(rows)) setPublicTestimonials(rows);
      })
      .catch(() => {
        // Conserva los testimonios de respaldo si el endpoint no está disponible.
      });
    return () => { cancelled = true; };
  }, []);

  const filters = useMemo(
    () => ({
      search: searchParams.get("q") || "",
      category: searchParams.get("category") || loaderFilters.category || "all",
      segment: searchParams.get("segment") || "all",
      serviceType: searchParams.get("serviceType") || "all",
      sort: searchParams.get("sort") || "popular",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      featuredOnly: searchParams.get("featured") === "1",
    }),
    [loaderFilters.category, searchParams]
  );

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  function updateFilter(key, value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "all" ||
        (key === "featured" && value !== "1")
      ) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      if (next.toString() === current.toString()) {
        return current;
      }

      return next;
    });
  }

  function clearFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("q");
      next.delete("category");
      next.delete("segment");
      next.delete("serviceType");
      next.delete("minPrice");
      next.delete("maxPrice");
      next.delete("featured");
      next.set("sort", "popular");
      return next;
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchDraft !== filters.search) {
        updateFilter("q", searchDraft);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [filters.search, searchDraft]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const items = await getPublicProductCategories();
        if (!cancelled) {
          setCategories(Array.isArray(items) ? items : []);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++productsRequestRef.current;

    async function loadProducts() {
      setIsLoadingCatalog(true);
      setCatalogError("");

      try {
        const catalog = await withTimeout(
          getPublicProducts({
            category: filters.category,
            productType: IS_JJ_PEGA ? "physical" : "service",
            search: filters.search,
            limit: 60,
            offset: 0,
          }),
          15000,
          "La carga del catálogo tardó demasiado. Intenta nuevamente."
        );

        if (cancelled || requestId !== productsRequestRef.current) {
          return;
        }

        const items = Array.isArray(catalog?.items)
          ? catalog.items.filter(
              (item) => item?.productType === (IS_JJ_PEGA ? "physical" : "service") && item?.isActive !== false
            )
          : [];
        setProducts(items);
      } catch (error) {
        if (cancelled || requestId !== productsRequestRef.current) {
          return;
        }
        setProducts([]);
        setCatalogError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la tienda."
        );
      } finally {
        if (!cancelled && requestId === productsRequestRef.current) {
          setIsLoadingCatalog(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [filters.category, filters.search]);

  const activeProducts = useMemo(
    () =>
      Array.isArray(products)
        ? products.filter((item) => item?.isActive !== false)
        : [],
    [products]
  );

  const categoryOptions = useMemo(() => {
    const fromCategories = Array.isArray(categories)
      ? categories
          .filter((category) => category?.isActive !== false)
          .map((category) => ({
            value: category.slug || null,
            label: category.name || "Categoría",
          }))
          .filter((category) => category.value)
      : [];

    const fallback = activeProducts
      .map((product) => ({
        value: product?.category?.slug,
        label: product?.category?.name || "Categoría",
      }))
      .filter((category) => category.value);

    const uniqueMap = new Map();
    [...fromCategories, ...fallback].forEach((category) => {
      if (!uniqueMap.has(category.value)) {
        uniqueMap.set(category.value, category);
      }
    });

    return Array.from(uniqueMap.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "es")
    );
  }, [activeProducts, categories]);

  const segmentOptions = useMemo(() => {
    const values = new Set(
      activeProducts.map((product) => getSegment(product)).filter(Boolean)
    );

    return Array.from(values)
      .map((value) => ({ value, label: toReadableLabel(value) }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [activeProducts]);

  const serviceTypeOptions = useMemo(() => {
    const values = new Set(
      activeProducts.map((product) => getServiceType(product)).filter(Boolean)
    );

    return Array.from(values)
      .map((value) => ({ value, label: toReadableLabel(value) }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [activeProducts]);

  const priceStats = useMemo(() => {
    const values = activeProducts
      .map((product) => Number(product?.price ?? 0))
      .filter((value) => Number.isFinite(value));
    if (!values.length) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...values)),
      max: Math.ceil(Math.max(...values)),
    };
  }, [activeProducts]);

  const visibleProducts = useMemo(() => {
    const searchTerm = normalize(filters.search);
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const hasMinPrice = Number.isFinite(minPrice) && filters.minPrice !== "";
    const hasMaxPrice = Number.isFinite(maxPrice) && filters.maxPrice !== "";

    const filtered = activeProducts.filter((product) => {
      if (filters.category !== "all" && product?.category?.slug !== filters.category) {
        return false;
      }

      if (filters.segment !== "all" && getSegment(product) !== filters.segment) {
        return false;
      }

      if (
        filters.serviceType !== "all" &&
        getServiceType(product) !== normalize(filters.serviceType)
      ) {
        return false;
      }

      if (filters.featuredOnly && !isFeatured(product)) {
        return false;
      }

      const price = Number(product?.price ?? 0);
      if (hasMinPrice && price < minPrice) {
        return false;
      }
      if (hasMaxPrice && price > maxPrice) {
        return false;
      }

      if (searchTerm) {
        const haystack = [
          product?.name,
          product?.shortDescription,
          product?.longDescription,
          product?.category?.name,
          product?.metadata?.commercial_segment,
          getSaleModeLabel(product),
        ]
          .map((item) => normalize(item))
          .join(" ");
        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });

    const byName = (left, right) => left.name.localeCompare(right.name, "es");
    const sorted = [...filtered];

    if (filters.sort === "price_asc") {
      sorted.sort(
        (left, right) => Number(left.price) - Number(right.price) || byName(left, right)
      );
      return sorted;
    }

    if (filters.sort === "price_desc") {
      sorted.sort(
        (left, right) => Number(right.price) - Number(left.price) || byName(left, right)
      );
      return sorted;
    }

    if (filters.sort === "name_asc") {
      sorted.sort(byName);
      return sorted;
    }

    sorted.sort((left, right) => {
      const featuredDelta = Number(isFeatured(right)) - Number(isFeatured(left));
      if (featuredDelta !== 0) return featuredDelta;

      const popularityDelta = getPopularityScore(right) - getPopularityScore(left);
      if (popularityDelta !== 0) return popularityDelta;

      const updatedLeft = new Date(left.updatedAt || 0).getTime();
      const updatedRight = new Date(right.updatedAt || 0).getTime();
      if (updatedLeft !== updatedRight) return updatedRight - updatedLeft;

      return byName(left, right);
    });

    return sorted;
  }, [activeProducts, filters]);

  const storeAssets = [
    "sticker-good-vibes.webp", "sticker-corazon-rosa.webp", "sticker-corona-jj.webp",
    "sticker-margarita.webp", "sticker-arcoiris.webp", "sticker-good-vibes-text.webp",
    "sticker-aguacate-feliz.webp", "sticker-shaka.webp",
  ];
  const getStoreCategoryHref = (title) => {
    const normalizedTitle = title.toLowerCase();
    const match = categoryOptions.find((category) => {
      const normalizedLabel = category.label.toLowerCase();
      return normalizedLabel.includes(normalizedTitle) || normalizedTitle.includes(normalizedLabel);
    });
    return match
      ? `/tienda?category=${encodeURIComponent(match.value)}`
      : `/tienda?q=${encodeURIComponent(title)}`;
  };
  const storeExampleProducts = [
    { id: "example-good-vibes", slug: "sticker-good-vibes", name: "Sticker Good Vibes", price: 15, coverImage: "/assets/jj-high-quality/sticker-good-vibes.webp", isExample: true },
    { id: "example-corazon-rosa", slug: "sticker-corazon-rosa", name: "Sticker Corazón Rosa", price: 15, coverImage: "/assets/jj-high-quality/sticker-corazon-rosa.webp", isExample: true },
    { id: "example-good-ideas", slug: "sticker-good-ideas-always", name: "Sticker Good Ideas Always", price: 15, coverImage: "/assets/jj-high-quality/sticker-good-vibes-text.webp", isExample: true },
    { id: "example-aguacate", slug: "sticker-aguacate-cool", name: "Sticker Aguacate Cool", price: 15, coverImage: "/assets/jj-high-quality/sticker-aguacate-feliz.webp", isExample: true },
    { id: "example-flower", slug: "sticker-flower-power", name: "Sticker Flower Power", price: 15, coverImage: "/assets/jj-high-quality/sticker-margarita.webp", isExample: true },
  ];
  const shopProducts = visibleProducts.length ? visibleProducts.slice(0, 5) : storeExampleProducts;
  const popularProducts = visibleProducts.length ? visibleProducts.slice(0, 5).reverse() : storeExampleProducts.slice().reverse();
  const reviewItems = publicTestimonials.length ? publicTestimonials.map((item) => ({
    ...item,
    meta: item.role_or_meta || item.meta || "Cliente",
  })) : [
    { id: "jj-fallback-1", rating: 5, quote: "Excelente calidad y los colores están increíbles. Llegaron súper rápido.", name: "Mariana G.", meta: "Compra verificada" },
    { id: "jj-fallback-2", rating: 5, quote: "Mis stickers personalizados quedaron perfectos. Justo como los imaginé.", name: "Carlos R.", meta: "Compra verificada" },
    { id: "jj-fallback-3", rating: 5, quote: "Amo los diseños, se nota una gran calidad y el empaque está súper lindo.", name: "Fernanda L.", meta: "Compra verificada" },
  ];
  const reviewPageSize = 3;
  const reviewPageCount = Math.max(1, Math.ceil(reviewItems.length / reviewPageSize));
  const visibleReviewItems = reviewItems.slice(reviewIndex * reviewPageSize, reviewIndex * reviewPageSize + reviewPageSize);

  useEffect(() => {
    setReviewIndex((current) => current >= reviewPageCount ? 0 : current);
  }, [reviewPageCount]);

  useEffect(() => {
    if (reviewPageCount <= 1) return undefined;
    const timer = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % reviewPageCount);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [reviewPageCount]);

  function showPreviousReview() {
    setReviewIndex((current) => (current - 1 + reviewPageCount) % reviewPageCount);
  }

  function showNextReview() {
    setReviewIndex((current) => (current + 1) % reviewPageCount);
  }
  const renderShopCard = (product, index, badge = "") => (
    <article className={`jj-shop-product jj-shop-product--${index % 5}`} key={`${product.slug || product.id}-${index}`}>
      <div className="jj-shop-product__media">
        <img src={product.coverImage || `/assets/jj-high-quality/${storeAssets[index % storeAssets.length]}`} alt={product.name} />
        {badge ? <span className="jj-shop-product__badge">{badge}</span> : null}
        <button type="button" className="jj-shop-product__favorite" aria-label={`Añadir ${product.name} a favoritos`}>♡</button>
      </div>
      <div className="jj-shop-product__body">
        <h3>{product.name}</h3>
        <p><strong>${Number(product.price || 0).toFixed(2)}</strong></p>
        <Link className="jj-shop-product__add" to={`/tienda/${product.slug}`} aria-label={`Ver ${product.name}`}>Ver producto</Link>
      </div>
    </article>
  );

  return (
    <main className="jj-store-page">
      <SEOHead title="Tienda JJ Pega | Stickers y buenas vibras" description="Compra stickers JJ Pega, elige tu tamaño y crea tu pedido." seoEntry={pageSeo} />
      <section className="jj-store-hero"><img src="/assets/jj-high-quality/store-banner.webp" alt="Nuestra tienda JJ Pega" /></section>
      <section className="jj-store-benefits"><div className="jj-store-container"><div className="jj-store-benefits__grid"><span>⚡ <b>Alta calidad</b><small>Colores que duran</small></span><span>🚚 <b>Envíos a todo el mundo</b><small>Tu idea, donde estés</small></span><span>♡ <b>Stickers que</b><small>hacen feliz</small></span></div></div></section>
      <CategorySection searchDraft={searchDraft} setSearchDraft={setSearchDraft} getCategoryHref={getStoreCategoryHref} />
      <section className="jj-store-section"><div className="jj-store-container"><div className="jj-store-products-banner"><img src="/assets/featured-products-title.webp" alt="Productos destacados" /></div>{isLoadingCatalog ? <p className="jj-store-loading">Cargando productos...</p> : shopProducts.length ? <div className="jj-shop-grid">{shopProducts.map((product, index) => renderShopCard(product, index, index === 0 ? "Más vendido" : index === 1 ? "Nuevo" : index === 2 ? "Popular" : "") )}</div> : <p className="jj-store-loading">No hay productos disponibles todavía.</p>}</div></section>
      <BlogNewsletterSection
        artBackground="/assets/jj-high-quality/newsletter/offers-banner.webp"
        artAlt="Ofertas JJ Pega: recibe descuentos y novedades"
        eyebrow="Ofertas JJ Pega"
        title="Recibe 10% de descuento en tu primera compra."
        description="Suscríbete al boletín de ofertas y recibe novedades, colecciones y promociones de stickers directamente en tu correo."
        source="website_store_newsletter"
        segment="store_newsletter"
        segments={["store_newsletter", "newsletter", "jj_pega_offers"]}
        successMessage="¡Listo! Revisa tu correo para recibir tu código de 10% de descuento."
        consentLabel="Al suscribirte aceptas recibir ofertas de JJ Pega."
      />
      <section className="jj-store-section"><div className="jj-store-container"><div className="jj-store-most-ordered-title"><img src="/assets/most-ordered-title.webp" alt="Los más pedidos" /></div>{popularProducts.length ? <div className="jj-shop-grid">{popularProducts.map((product, index) => renderShopCard(product, index + 3))}</div> : null}<div className="jj-store-most-ordered-cta"><Link className="jj-image-button" to="/tienda"><img src="/assets/most-ordered-cta.webp" alt="Ver más productos" /></Link></div></div></section>
      <section className="jj-store-section jj-store-reviews"><div className="jj-store-container"><div className="jj-store-section__head jj-store-reviews__head"><img className="jj-store-reviews-banner" src="/assets/jj-high-quality/reviews-title.webp" alt="Lo que dicen nuestros clientes" /></div><div className="jj-review-slideshow"><button type="button" className="jj-review-slideshow__arrow jj-review-slideshow__arrow--prev" onClick={showPreviousReview} aria-label="Testimonios anteriores">←</button><div className="jj-review-grid">{visibleReviewItems.map((item) => <article className="jj-review-card" key={item.id}><div className="jj-review-card__top"><span className="jj-review-card__avatar">{getReviewInitials(item.name)}</span><span className="jj-review-card__stars" aria-label={String(item.rating || 5) + " estrellas"}>{"★".repeat(Math.max(1, Math.min(5, Number(item.rating) || 5)))}</span><span className="jj-review-card__quote-mark" aria-hidden="true">“</span></div><p className="jj-review-card__quote">“{item.quote}”</p><div className="jj-review-card__author"><b>{item.name}</b><small><span aria-hidden="true">✓</span> {item.meta || "Compra verificada"}</small></div><span className="jj-review-card__heart" aria-hidden="true">♥</span></article>)}</div><button type="button" className="jj-review-slideshow__arrow jj-review-slideshow__arrow--next" onClick={showNextReview} aria-label="Siguientes testimonios">→</button></div>{reviewPageCount > 1 ? <div className="jj-review-slideshow__dots" aria-label="Navegación de testimonios">{Array.from({ length: reviewPageCount }).map((_, index) => <button type="button" key={index} className={index === reviewIndex ? "is-active" : ""} onClick={() => setReviewIndex(index)} aria-label={"Ver grupo de testimonios " + (index + 1)} />)}</div> : null}</div></section>
      <section className="jj-store-container"><div className="jj-store-trust"><span>◇ <b>Calidad premium</b><small>Stickers que duran</small></span><span>🚚 <b>Envíos a todo el mundo</b><small>Rápido y seguro</small></span><span>☺ <b>Compra segura</b><small>Tus datos están protegidos</small></span><span>⌁ <b>Amamos el planeta</b><small>Empaques responsables</small></span></div></section>
    </main>
  );
}
