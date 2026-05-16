import { useEffect, useMemo, useRef, useState } from "react";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ProductsGrid from "@/components/shared/ProductsGrid.jsx";
import {
  addProductToPublicCart,
  getPublicProductCategories,
  getPublicProducts,
} from "@/lib/api.js";

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

export default function StorePage() {
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
  const [addingProductSlug, setAddingProductSlug] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cartState, setCartState] = useState({
    status: "idle",
    message: "",
  });
  const productsRequestRef = useRef(0);

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
        const catalog = await getPublicProducts({
          category: filters.category,
          productType: "service",
          search: filters.search,
          limit: 60,
          offset: 0,
        });

        if (cancelled || requestId !== productsRequestRef.current) {
          return;
        }

        const items = Array.isArray(catalog?.items)
          ? catalog.items.filter(
              (item) => item?.productType === "service" && item?.isActive !== false
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
            : "No se pudo cargar el catálogo de servicios."
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

  async function handleAddToCart(product) {
    setAddingProductSlug(product.slug);
    setCartState({
      status: "loading",
      message: `Agregando ${product.name} al carrito...`,
    });

    try {
      const cart = await addProductToPublicCart({
        productId: product.id,
        productSlug: product.slug,
        quantity: 1,
      });

      setCartState({
        status: "success",
        message: `Servicio agregado. Tu resumen ahora tiene ${cart.summary.totalQuantity} servicios.`,
      });
    } catch (error) {
      setCartState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo agregar el servicio al resumen.",
      });
    } finally {
      setAddingProductSlug(null);
    }
  }

  return (
    <section className="section services-market">
      <SEOHead
        title="Servicios Creativos | Ideas Estudio"
        description="Explora fotografía, video, diseño gráfico y branding profesional para tu marca, negocio o evento en Puerto Rico."
        canonical="https://ideasestudio.com/servicios"
      />
      <div className="container services-market__container">
        <nav className="services-market__breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Inicio</Link>
          <span>/</span>
          <span>Servicios</span>
        </nav>

        <header className="services-market__header">
          <div>
            <h1>Servicios profesionales</h1>
            <p>
              Soluciones creativas y estratégicas para impulsar tu marca, evento o negocio.
            </p>
          </div>

          <div className="services-market__header-meta">
            <strong>{isLoadingCatalog ? "..." : visibleProducts.length}</strong>
            <span>
              {visibleProducts.length === 1
                ? "servicio visible"
                : "servicios visibles"}
            </span>
          </div>
        </header>

        <div className="services-market__toolbar">
          <label className="field services-market__search">
            <span>Buscar servicios</span>
            <input
              type="search"
              value={searchDraft}
              placeholder="Buscar por nombre, categoría o segmento"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </label>

          <label className="field services-market__sort">
            <span>Ordenar por</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button
            to="/servicios/carrito"
            variant="secondary"
            className="services-market__toolbar-cta"
          >
            Resumen de contratación
          </Button>
        </div>

        <div className="services-market__counter">
          <p>
            Mostrando {visibleProducts.length} de {activeProducts.length} servicios activos.
          </p>
          <button
            type="button"
            className="services-market__mobile-filter-btn"
            onClick={() => setMobileFiltersOpen((current) => !current)}
          >
            {mobileFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>

        <div className="services-market__layout">
          <aside
            className={`services-market__filters ${
              mobileFiltersOpen ? "services-market__filters--open" : ""
            }`}
          >
            <div className="services-market__filter-group">
              <h3>Categorías</h3>
              <select
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
              >
                <option value="all">Todas</option>
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="services-market__filter-group">
              <h3>Segmento</h3>
              <select
                value={filters.segment}
                onChange={(event) => updateFilter("segment", event.target.value)}
              >
                <option value="all">Todos</option>
                {segmentOptions.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="services-market__filter-group">
              <h3>Tipo de servicio</h3>
              <select
                value={filters.serviceType}
                onChange={(event) => updateFilter("serviceType", event.target.value)}
              >
                <option value="all">Todos</option>
                {serviceTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="services-market__filter-group">
              <h3>Rango de precio (USD)</h3>
              <div className="services-market__price-range">
                <input
                  type="number"
                  min={priceStats.min}
                  max={priceStats.max || undefined}
                  value={filters.minPrice}
                  onChange={(event) => updateFilter("minPrice", event.target.value)}
                  placeholder={`Mín ${priceStats.min || 0}`}
                />
                <input
                  type="number"
                  min={priceStats.min}
                  max={priceStats.max || undefined}
                  value={filters.maxPrice}
                  onChange={(event) => updateFilter("maxPrice", event.target.value)}
                  placeholder={`Máx ${priceStats.max || 0}`}
                />
              </div>
            </div>

            <div className="services-market__filter-group">
              <h3>Destacados</h3>
              <label className="services-market__checkbox">
                <input
                  type="checkbox"
                  checked={filters.featuredOnly}
                  onChange={(event) =>
                    updateFilter("featured", event.target.checked ? "1" : "")
                  }
                />
                Solo mostrar destacados
              </label>
            </div>

            <button
              type="button"
              className="services-market__clear-btn"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          </aside>

          <div className="services-market__results">
            {cartState.status !== "idle" ? (
              <p className={`form-status form-status--${cartState.status}`}>
                {cartState.message}
              </p>
            ) : null}

            {catalogError ? (
              <p className="form-status form-status--error">{catalogError}</p>
            ) : null}

            {isLoadingCatalog ? (
              <div className="empty-state services-market__empty">
                <h2>Cargando servicios...</h2>
                <p>Estamos preparando el catálogo para ti.</p>
              </div>
            ) : visibleProducts.length ? (
              <ProductsGrid
                products={visibleProducts}
                onAddToCart={handleAddToCart}
                addingProductSlug={addingProductSlug}
              />
            ) : (
              <div className="empty-state services-market__empty">
                <h2>No encontramos servicios con esos filtros</h2>
                <p>
                  Ajusta búsqueda, categoría o rango de precio para descubrir más
                  opciones disponibles.
                </p>
                <Button onClick={clearFilters}>Restablecer filtros</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
