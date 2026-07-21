import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ServiceMembershipPlansModal from "@/components/memberships/ServiceMembershipPlansModal.jsx";

import { addProductToPublicCart, getPublicProducts } from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { allowsServiceQuantity } from "@/lib/serviceFlowType.js";
import {
  getHowItWorksSteps,
  getIncludesItems,
  getPrimaryCtaLabel,
  getQuickFacts,
} from "@/lib/serviceContentLabels.js";

const MAX_ADDITIONAL_GALLERY_IMAGES = 3;
const MAX_VISIBLE_INCLUDES = 8;
const LONG_INCLUDE_ITEM_LENGTH = 140;

const QUICK_FACT_ICONS = {
  clock: Clock3,
  badge: BadgeCheck,
  layers: Layers3,
  sparkles: Sparkles,
};

function getGalleryImages(product) {
  const cover =
    typeof product?.coverImage === "string" ? product.coverImage.trim() : "";
  const extras = (Array.isArray(product?.gallery) ? product.gallery : [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .filter((url, index, arr) => arr.indexOf(url) === index)
    .filter((url) => !cover || url !== cover)
    .slice(0, MAX_ADDITIONAL_GALLERY_IMAGES);

  if (cover) {
    return [cover, ...extras];
  }

  return extras.slice(0, MAX_ADDITIONAL_GALLERY_IMAGES);
}

function getPriceLabel(product) {
  const raw = product?.price;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "USD —";
  }
  return formatPrice(numeric, product?.currency || "USD");
}

/**
 * Splits description_long into paragraph / list blocks, preserving the
 * "Incluye:\n- item\n- item" structure real service descriptions use
 * instead of collapsing everything into one paragraph.
 */
function parseLongDescription(text) {
  const blocks = String(text || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line))) {
      return {
        type: "list",
        items: lines.map((line) => line.replace(/^[-•]\s+/, "")),
      };
    }

    if (
      lines.length > 1 &&
      /:$/.test(lines[0]) &&
      lines.slice(1).every((line) => /^[-•]\s+/.test(line))
    ) {
      return {
        type: "heading-list",
        heading: lines[0],
        items: lines.slice(1).map((line) => line.replace(/^[-•]\s+/, "")),
      };
    }

    return { type: "paragraph", text: lines.join(" ") };
  });
}

export default function ProductDetailPage() {
  const { product } = useLoaderData();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [actionState, setActionState] = useState({
    status: "idle",
    message: "",
  });
  const [pendingAction, setPendingAction] = useState("");
  const [relatedState, setRelatedState] = useState({
    status: "idle",
    items: [],
  });
  const [includesExpanded, setIncludesExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  const galleryImages = useMemo(() => getGalleryImages(product), [product]);
  const hasGallery = galleryImages.length > 0;
  const selectedIndex = Math.max(0, galleryImages.indexOf(selectedImage));

  const includesItems = useMemo(() => getIncludesItems(product), [product]);
  const quickFacts = useMemo(() => getQuickFacts(product), [product]);
  const howItWorksSteps = useMemo(() => getHowItWorksSteps(product), [product]);
  const primaryCtaLabel = useMemo(() => getPrimaryCtaLabel(product), [product]);
  const descriptionBlocks = useMemo(
    () => parseLongDescription(product?.longDescription),
    [product]
  );

  const visibleIncludes = includesExpanded
    ? includesItems
    : includesItems.slice(0, MAX_VISIBLE_INCLUDES);
  const hasMoreIncludes = includesItems.length > MAX_VISIBLE_INCLUDES;

  useEffect(() => {
    setSelectedImage(galleryImages[0] || "");
  }, [galleryImages]);

  useEffect(() => {
    let cancelled = false;

    async function loadRelated() {
      if (!product?.slug) {
        if (!cancelled) {
          setRelatedState({ status: "idle", items: [] });
        }
        return;
      }

      setRelatedState((current) => ({ ...current, status: "loading" }));
      try {
        const response = await getPublicProducts({
          category: product?.category?.slug || "all",
          productType: "service",
          limit: 6,
          offset: 0,
        });

        if (cancelled) return;

        const items = (response?.items || [])
          .filter(
            (item) =>
              item?.isActive !== false &&
              item?.productType === "service" &&
              item?.slug !== product.slug
          )
          .slice(0, 3);

        setRelatedState({
          status: "success",
          items,
        });
      } catch {
        if (!cancelled) {
          setRelatedState({
            status: "error",
            items: [],
          });
        }
      }
    }

    loadRelated();

    return () => {
      cancelled = true;
    };
  }, [product?.category?.slug, product?.slug]);

  useEffect(() => {
    const footer = document.querySelector(".site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "0px" }
    );
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  if (!product) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Servicio no encontrado</h1>
            <p>El servicio solicitado no existe o no está publicado.</p>
            <Button to="/servicios">Volver a servicios</Button>
          </div>
        </div>
      </section>
    );
  }

  async function handleCartAction(mode) {
    setPendingAction(mode);
    setActionState({
      status: "loading",
      message:
        mode === "checkout"
          ? "Preparando contratación..."
          : "Añadiendo servicio al resumen...",
    });

    try {
      const cart = await addProductToPublicCart({
        productId: product.id,
        productSlug: product.slug,
        quantity,
      });

      setActionState({
        status: "success",
        message: `Servicio agregado. Tu resumen ahora tiene ${cart.summary.totalQuantity} ${
          cart.summary.totalQuantity === 1 ? "servicio" : "servicios"
        }.`,
      });

      if (mode === "checkout") {
        const checkoutUrl = cart?.sessionToken
          ? `/servicios/checkout?sessionToken=${encodeURIComponent(cart.sessionToken)}`
          : "/servicios/checkout";
        navigate(checkoutUrl);
        return;
      }

      navigate("/servicios/carrito");
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo continuar con la contratación.",
      });
    } finally {
      setPendingAction("");
    }
  }

  function handleImageStep(direction) {
    if (!hasGallery) return;
    const lastIndex = galleryImages.length - 1;
    const nextIndex =
      direction === "next"
        ? selectedIndex >= lastIndex
          ? 0
          : selectedIndex + 1
        : selectedIndex <= 0
        ? lastIndex
        : selectedIndex - 1;

    setSelectedImage(galleryImages[nextIndex]);
  }

  return (
    <section className="section service-detail-page">
      <div className="container service-detail-page__container">
        <nav className="service-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Inicio</Link>
          <span>/</span>
          <Link to="/servicios">Servicios</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="service-detail-layout">
          <article className="service-detail-gallery">
            <div className="service-detail-gallery__main">
              {hasGallery ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  loading="eager"
                  className="service-detail-gallery__image"
                />
              ) : (
                <div className="service-detail-gallery__placeholder">
                  <p>Servicio premium</p>
                  <small>Ideas Estudio</small>
                </div>
              )}

              {hasGallery && galleryImages.length > 1 ? (
                <div className="service-detail-gallery__controls">
                  <button
                    type="button"
                    onClick={() => handleImageStep("prev")}
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageStep("next")}
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : null}
            </div>

            {hasGallery && galleryImages.length > 1 ? (
              <div className="service-detail-gallery__thumbs">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={`service-detail-gallery__thumb ${
                      selectedImage === image
                        ? "service-detail-gallery__thumb--active"
                        : ""
                    }`}
                    onClick={() => setSelectedImage(image)}
                    aria-label={`Seleccionar imagen ${index + 1}`}
                  >
                    <img src={image} alt={`${product.name} vista ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </article>

          <aside className="service-detail-content">
            <span className="pill service-detail-content__category">
              {product.category?.name || "Servicios"}
            </span>

            <h1>{product.name}</h1>

            {product.shortDescription ? (
              <p className="service-detail-content__short">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="service-detail-content__price">
              <small>Desde</small>
              <strong>{getPriceLabel(product)}</strong>
            </div>

            {quickFacts.length > 0 ? (
              <ul
                className="service-detail-quickfacts"
                aria-label="Datos clave del servicio"
              >
                {quickFacts.map((fact) => {
                  const Icon = QUICK_FACT_ICONS[fact.icon];
                  return (
                    <li key={fact.key} className="service-detail-quickfacts__item">
                      <Icon size={18} aria-hidden="true" />
                      <div>
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="service-detail-purchase">
              {allowsServiceQuantity(product) ? (
                <div className="service-detail-purchase__quantity">
                  <span>Cantidad</span>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((current) => Math.max(1, current - 1))
                      }
                      aria-label="Reducir cantidad"
                      disabled={pendingAction !== ""}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => current + 1)}
                      aria-label="Aumentar cantidad"
                      disabled={pendingAction !== ""}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="service-detail-purchase__actions">
                <Button
                  onClick={() => handleCartAction("checkout")}
                  disabled={pendingAction !== ""}
                  className="service-detail-purchase__checkout-btn"
                >
                  {pendingAction === "checkout" ? "Procesando..." : primaryCtaLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleCartAction("cart")}
                  disabled={pendingAction !== ""}
                  className="service-detail-purchase__summary-btn"
                >
                  {pendingAction === "cart" ? "Añadiendo..." : "Añadir al resumen"}
                </Button>
              </div>

              {product.serviceId ? (
                <Button
                  variant="secondary"
                  onClick={() => setPlansModalOpen(true)}
                  className="service-detail-purchase__plans-btn"
                >
                  Conocer planes
                </Button>
              ) : null}

              <ul className="service-detail-purchase__trust">
                <li>
                  <ShieldCheck size={16} />
                  <span>Pago seguro con Stripe</span>
                </li>
                <li>
                  <BadgeCheck size={16} />
                  <span>Confirmación automática</span>
                </li>
                <li>
                  <MessagesSquare size={16} />
                  <span>Atención personalizada</span>
                </li>
              </ul>
            </div>

            {actionState.status !== "idle" ? (
              <p className={`form-status form-status--${actionState.status}`}>
                {actionState.message}
              </p>
            ) : null}
          </aside>
        </div>

        {includesItems.length > 0 ? (
          <section
            className="service-detail-includes"
            aria-labelledby="service-detail-includes-heading"
          >
            <h2 id="service-detail-includes-heading">Qué incluye</h2>
            <ul className="service-detail-includes__grid">
              {visibleIncludes.map((item) => (
                <li
                  key={item}
                  className={
                    item.length > LONG_INCLUDE_ITEM_LENGTH ? "is-wide" : ""
                  }
                >
                  <Check size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {hasMoreIncludes ? (
              <button
                type="button"
                className="service-detail-includes__toggle"
                onClick={() => setIncludesExpanded((current) => !current)}
                aria-expanded={includesExpanded}
              >
                {includesExpanded
                  ? "Ver menos"
                  : `Ver todos los elementos incluidos (${includesItems.length})`}
              </button>
            ) : null}
          </section>
        ) : null}

        <section
          className="service-detail-how"
          aria-labelledby="service-detail-how-heading"
        >
          <h2 id="service-detail-how-heading">Cómo funciona</h2>
          <ol className="service-detail-how__steps">
            {howItWorksSteps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {descriptionBlocks.length > 0 ? (
          <section className="service-detail-accordion">
            <button
              type="button"
              className="service-detail-accordion__trigger"
              aria-expanded={detailsOpen}
              aria-controls="service-detail-accordion-panel"
              onClick={() => setDetailsOpen((current) => !current)}
            >
              <span>Ver todos los detalles del servicio</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={
                  detailsOpen
                    ? "service-detail-accordion__chevron is-open"
                    : "service-detail-accordion__chevron"
                }
              />
            </button>
            {detailsOpen ? (
              <div
                id="service-detail-accordion-panel"
                className="service-detail-accordion__panel"
                role="region"
                aria-label="Detalles completos del servicio"
              >
                {descriptionBlocks.map((block, index) => {
                  if (block.type === "list") {
                    return (
                      <ul key={index}>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === "heading-list") {
                    return (
                      <div key={index}>
                        <p className="service-detail-accordion__heading">
                          {block.heading}
                        </p>
                        <ul>
                          {block.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return <p key={index}>{block.text}</p>;
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {relatedState.items.length ? (
          <section className="service-detail-related">
            <div className="service-detail-related__header">
              <h2>Servicios relacionados</h2>
              <Link to="/servicios">Ver catálogo completo</Link>
            </div>

            <div className="service-detail-related__grid">
              {relatedState.items.map((item) => (
                <article key={item.id || item.slug} className="service-detail-related__card">
                  <Link to={`/servicios/${item.slug}`} className="service-detail-related__media">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.name} loading="lazy" />
                    ) : (
                      <div>
                        <span>Servicio</span>
                      </div>
                    )}
                  </Link>
                  <div className="service-detail-related__copy">
                    <span>{item.category?.name || "Servicios"}</span>
                    <h3>
                      <Link to={`/servicios/${item.slug}`}>{item.name}</Link>
                    </h3>
                    <strong>{getPriceLabel(item)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div
        className={`service-detail-mobile-cta${
          footerVisible ? " is-hidden" : ""
        }`}
      >
        <div className="service-detail-mobile-cta__info">
          <strong>{getPriceLabel(product)}</strong>
          <span>{product.name}</span>
        </div>
        <Button
          onClick={() => handleCartAction("checkout")}
          disabled={pendingAction !== ""}
          className="service-detail-mobile-cta__btn"
        >
          {pendingAction === "checkout" ? "Procesando..." : primaryCtaLabel}
        </Button>
      </div>

      {product.serviceId ? (
        <ServiceMembershipPlansModal
          serviceId={product.serviceId}
          serviceName={product.name}
          open={plansModalOpen}
          onClose={() => setPlansModalOpen(false)}
        />
      ) : null}
    </section>
  );
}
