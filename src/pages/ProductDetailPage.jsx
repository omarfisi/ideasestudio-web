import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
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

import { addProductToPublicCart, getPublicProducts } from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { allowsServiceQuantity } from "@/lib/serviceFlowType.js";

const MAX_ADDITIONAL_GALLERY_IMAGES = 3;

function toReadableLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeList(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof rawValue === "string") {
    return rawValue
      .split(/\r?\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeFaqs(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") {
          return { question: item, answer: "" };
        }
        if (typeof item === "object") {
          const question = String(item.question || item.q || "").trim();
          const answer = String(item.answer || item.a || "").trim();
          if (!question) return null;
          return { question, answer };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
}

function getDuration(product) {
  const metadata = product?.metadata || {};
  const raw =
    metadata.duration ||
    metadata.duration_days ||
    metadata.default_duration_days ||
    metadata.delivery_time_days ||
    metadata.delivery_time;

  if (raw === null || raw === undefined || raw === "") {
    return "";
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric === 1 ? "1 día" : `${numeric} días`;
  }

  return toReadableLabel(raw);
}

function getServiceType(product) {
  const metadata = product?.metadata || {};
  const value =
    metadata.service_type || metadata.product_type || product?.productType || "";
  return value ? toReadableLabel(value) : "";
}

function getSegment(product) {
  const metadata = product?.metadata || {};
  const value = metadata.commercial_segment || metadata.segment || "";
  return value ? toReadableLabel(value) : "";
}

function getSaleMode(product) {
  const metadata = product?.metadata || {};
  const mode = String(metadata.sale_mode || "").trim().toLowerCase();
  if (!mode) return "";
  if (mode === "buy_now") return "Compra directa";
  if (mode === "deposit_booking") return "Reserva";
  if (mode === "quote_only") return "Propuesta";
  return toReadableLabel(mode);
}

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

  const galleryImages = useMemo(() => getGalleryImages(product), [product]);
  const hasGallery = galleryImages.length > 0;
  const selectedIndex = Math.max(0, galleryImages.indexOf(selectedImage));

  const includes = useMemo(() => {
    const metadata = product?.metadata || {};
    const fromMetadata = [
      ...normalizeList(metadata.includes),
      ...normalizeList(metadata.includes_items),
      ...normalizeList(metadata.deliverables),
    ];
    if (fromMetadata.length) return fromMetadata;

    const fromRaw = [
      ...normalizeList(product?.raw?.metadata_json?.includes),
      ...normalizeList(product?.raw?.metadata_json?.includes_items),
      ...normalizeList(product?.raw?.metadata_json?.deliverables),
    ];
    if (fromRaw.length) return fromRaw;

    return [
      "Definición de alcance y objetivos del servicio.",
      "Ejecución profesional con seguimiento continuo.",
      "Entrega final organizada y lista para implementación.",
    ];
  }, [product]);

  const processSteps = useMemo(() => {
    const metadata = product?.metadata || {};
    return [
      ...normalizeList(metadata.process_steps),
      ...normalizeList(metadata.workflow_steps),
      ...normalizeList(metadata.steps),
    ];
  }, [product]);

  const faqs = useMemo(() => {
    const metadata = product?.metadata || {};
    return [
      ...normalizeFaqs(metadata.faqs),
      ...normalizeFaqs(metadata.faq),
      ...normalizeFaqs(metadata.questions),
    ];
  }, [product]);

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

  const duration = getDuration(product);
  const serviceType = getServiceType(product);
  const segment = getSegment(product);
  const saleMode = getSaleMode(product);
  const metadataRows = [
    {
      key: "duration",
      icon: Clock3,
      label: duration || "Duración a coordinar",
    },
    {
      key: "serviceType",
      icon: Layers3,
      label: serviceType || "Servicio profesional",
    },
    {
      key: "segment",
      icon: Sparkles,
      label: segment || "Segmento general",
    },
    {
      key: "saleMode",
      icon: BadgeCheck,
      label: saleMode || "Contratación directa",
    },
  ];

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
        message: `Servicio agregado. Tu resumen ahora tiene ${cart.summary.totalQuantity} servicios.`,
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

            <div className="service-detail-content__price">
              <small>Desde</small>
              <strong>{getPriceLabel(product)}</strong>
            </div>

            <p className="service-detail-content__short">
              {product.shortDescription ||
                "Servicio profesional diseñado para impulsar resultados concretos en tu negocio."}
            </p>

            <ul className="service-detail-content__meta">
              {metadataRows.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.key}>
                    <Icon size={16} />
                    <span>{row.label}</span>
                  </li>
                );
              })}
            </ul>

            <div className="service-detail-purchase">
              {allowsServiceQuantity(product) ? (
              <div className="service-detail-purchase__quantity">
                <span>Cantidad</span>
                <div>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
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
                  variant="secondary"
                  onClick={() => handleCartAction("cart")}
                  disabled={pendingAction !== ""}
                  className="service-detail-purchase__summary-btn"
                >
                  {pendingAction === "cart" ? "Añadiendo..." : "Añadir al resumen"}
                </Button>
                <Button
                  onClick={() => handleCartAction("checkout")}
                  disabled={pendingAction !== ""}
                  className="service-detail-purchase__checkout-btn"
                >
                  {pendingAction === "checkout"
                    ? "Procesando..."
                    : "Contratar ahora"}
                </Button>
              </div>

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

        <div className="service-detail-sections">
          <article className="service-detail-section-card service-detail-section-card--wide">
            <h2>Descripción del servicio</h2>
            <p>
              {product.longDescription ||
                product.shortDescription ||
                "Servicio profesional diseñado para resolver tu necesidad con una ejecución clara y acompañamiento continuo."}
            </p>
          </article>

          <article className="service-detail-section-card">
            <h2>Qué incluye</h2>
            <ul>
              {includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          {processSteps.length > 0 ? (
            <article className="service-detail-section-card">
              <h2>Proceso de trabajo</h2>
              <ol>
                {processSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ) : null}

          {faqs.length > 0 ? (
            <article className="service-detail-section-card">
              <h2>Preguntas frecuentes</h2>
              <div className="service-detail-faq">
                {faqs.map((faq) => (
                  <article key={faq.question}>
                    <h3>{faq.question}</h3>
                    {faq.answer ? <p>{faq.answer}</p> : null}
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </div>

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
    </section>
  );
}
