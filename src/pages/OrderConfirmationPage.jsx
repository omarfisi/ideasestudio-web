import { useLoaderData, useLocation } from "react-router-dom";
import { Check, ClipboardCheck, FileText, Mail } from "lucide-react";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { formatPrice } from "@/lib/formatPrice.js";
import { resolveQuoteConfirmationContext } from "@/lib/bookingCheckoutSteps.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

function formatConfirmationDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// proposal_generation_status ("completed" | "failed" | null, see
// store_checkout_create_order's response) drives the badge/copy only —
// never payment/blocking behavior, which is already fully governed by
// payment_required and the order's own document_type server-side. A
// "failed" generation never surfaces as an error to the customer: their
// request was still received, staff will follow up regardless of whether
// the automatic proposal document itself generated cleanly.
const PROPOSAL_STATUS_CONTENT = {
  completed: {
    badgeLabel: "Propuesta creada",
    badgeTone: "completed",
    message: "La propuesta fue generada y será enviada al correo indicado.",
  },
  failed: {
    badgeLabel: "Solicitud recibida",
    badgeTone: "received",
    message:
      "Recibimos tu solicitud. Nuestro equipo preparará la propuesta y se comunicará contigo.",
  },
};

function readStoredOrderRecovery() {
  try {
    const raw = window.localStorage.getItem("last_store_order");
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupt/unparsable JSON — treated the same as "nothing stored" by
    // resolveQuoteConfirmationContext (null in, null out).
    return null;
  }
}

export default function OrderConfirmationPage() {
  const { order } = useLoaderData();
  const location = useLocation();
  const { session } = useAuth();
  // React Router navigation state exists only on the very first render
  // right after checkout — a refresh, direct link, or recovered-navigation
  // has none of it. resolveQuoteConfirmationContext falls back to the
  // last_store_order localStorage bookmark in that case, but only when it
  // exactly matches this order and still describes an unapproved
  // cotización; otherwise this resolves to null — display framing only,
  // never a source of truth for money/status, which always come from the
  // loader's real backend order below.
  const checkoutState = order
    ? resolveQuoteConfirmationContext({
        locationState: location.state,
        storedState: readStoredOrderRecovery(),
        orderNumber: order.orderNumber,
      })
    : null;
  const isQuoteConfirmation = checkoutState?.paymentRequired === false;

  if (!order) {
    return (
      <>
        <PageHero
          eyebrow="Servicios"
          title="Orden no encontrada"
          subtitle="La confirmación que buscas no existe o todavía no está disponible."
        />

        <section className="section">
          <div className="container">
            <div className="empty-state">
              <h2>No pudimos cargar esa orden</h2>
              <p>
                Verifica el número de orden o vuelve al catálogo de servicios para
                retomar el flujo comercial.
              </p>
              <div className="empty-state__actions">
                <Button to="/servicios">Ir a servicios</Button>
                <Button to="/servicios" variant="secondary">
                  Ver servicios
                </Button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (isQuoteConfirmation) {
    const statusContent =
      PROPOSAL_STATUS_CONTENT[checkoutState?.proposalGenerationStatus] || null;
    const badgeLabel = statusContent?.badgeLabel || "Propuesta en preparación";
    const badgeTone = statusContent?.badgeTone || "pending";
    // Only the "completed" case has real evidence in the response that an
    // email actually went out (send_store_document_email is only ever
    // called from the success branch of create_store_proposal_for_order —
    // see store_checkout_create_order) — every other case must speak in
    // future tense, never claim a send that hasn't been confirmed.
    const emailConfirmed = checkoutState?.proposalGenerationStatus === "completed";

    return (
      <>
        <section className="quote-confirmation-hero">
          <div className="container quote-confirmation-hero__inner">
            <span className="eyebrow">Solicitud recibida</span>
            <h1 className="quote-confirmation-hero__title">
              Recibimos tu solicitud de propuesta
            </h1>
            <p className="quote-confirmation-hero__subtitle">
              Nuestro equipo revisará los detalles y te enviará la propuesta al
              correo indicado.
            </p>
          </div>
        </section>

        <section className="quote-confirmation-section">
          <div className="container quote-confirmation-container">
            <article className="quote-confirmation-card" aria-live="polite">
              <div className="quote-confirmation-card__icon" aria-hidden="true">
                <Check size={26} strokeWidth={3} />
              </div>

              <span
                className={`quote-confirmation-badge quote-confirmation-badge--${badgeTone}`}
              >
                {badgeLabel}
              </span>

              <h2 className="quote-confirmation-card__title">
                Tu solicitud fue recibida correctamente
              </h2>
              <p className="quote-confirmation-card__message">
                {statusContent?.message || (
                  <>
                    Revisaremos los servicios seleccionados y prepararemos una
                    propuesta con el alcance, precio y próximos pasos. La
                    recibirás en: <strong>{order.email}</strong>
                  </>
                )}
              </p>
              <p className="quote-confirmation-card__no-charge">
                No se realizó ningún cargo.
              </p>

              <dl className="quote-confirmation-reference">
                <div className="quote-confirmation-reference__item">
                  <dt>Número de solicitud</dt>
                  <dd>{order.orderNumber}</dd>
                </div>
                <div className="quote-confirmation-reference__item">
                  <dt>Fecha</dt>
                  <dd>{formatConfirmationDate(order.createdAt)}</dd>
                </div>
                {checkoutState?.customerName ? (
                  <div className="quote-confirmation-reference__item">
                    <dt>Nombre</dt>
                    <dd>{checkoutState.customerName}</dd>
                  </div>
                ) : null}
                <div className="quote-confirmation-reference__item">
                  <dt>Correo</dt>
                  <dd className="quote-confirmation-reference__email">{order.email}</dd>
                </div>
              </dl>

              <div className="quote-confirmation-divider" role="presentation" />

              <section
                className="quote-confirmation-services"
                aria-labelledby="quote-confirmation-services-heading"
              >
                <h3 id="quote-confirmation-services-heading">Servicios solicitados</h3>
                <div className="quote-confirmation-services__list">
                  {order.items.map((item) => (
                    <div
                      className="quote-confirmation-services__row"
                      key={item.id || item.productId}
                    >
                      <div className="quote-confirmation-services__name">
                        <strong>{item.snapshotName}</strong>
                        <span>Cantidad: {item.quantity}</span>
                      </div>
                      <span className="quote-confirmation-services__estimate">
                        Estimado:{" "}
                        {formatPrice(item.unitPrice, item.product?.currency || order.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="quote-confirmation-total">
                  <span>Total estimado</span>
                  <strong>{formatPrice(order.total, order.currency)}</strong>
                </div>
                <p className="quote-confirmation-total__note">
                  El total final puede variar según el alcance aprobado en la propuesta.
                </p>
              </section>

              <div className="quote-confirmation-divider" role="presentation" />

              <section
                className="quote-confirmation-steps"
                aria-labelledby="quote-confirmation-steps-heading"
              >
                <h3 id="quote-confirmation-steps-heading">¿Qué ocurre ahora?</h3>
                <div className="quote-confirmation-steps__grid">
                  <div className="quote-confirmation-step">
                    <ClipboardCheck aria-hidden="true" size={22} strokeWidth={1.75} />
                    <strong>Paso 1</strong>
                    <p>Revisamos tu solicitud.</p>
                  </div>
                  <div className="quote-confirmation-step">
                    <FileText aria-hidden="true" size={22} strokeWidth={1.75} />
                    <strong>Paso 2</strong>
                    <p>Preparamos la propuesta.</p>
                  </div>
                  <div className="quote-confirmation-step">
                    <Mail aria-hidden="true" size={22} strokeWidth={1.75} />
                    <strong>Paso 3</strong>
                    <p>Te enviamos la propuesta por correo para revisión y aprobación.</p>
                  </div>
                </div>
              </section>

              <p className="quote-confirmation-email-strip">
                {emailConfirmed
                  ? "También enviamos una confirmación a:"
                  : "Enviaremos la propuesta a:"}{" "}
                <strong>{order.email}</strong>
              </p>

              <div className="quote-confirmation-actions">
                {session && order.id ? (
                  // Authenticated: the real order-detail page (document_
                  // type/proposal_id/invoice_id-aware, see orderPaymentState.js)
                  // — never this same confirmation URL, which would be a
                  // circular link that just reloads this page.
                  <Button to={`/mi-cuenta/ordenes/${order.id}`} block>
                    Ver estado de mi solicitud
                  </Button>
                ) : (
                  // Guest: no authenticated order-detail page exists for
                  // them to navigate to (see AccountOrderDetailPage, which
                  // requires a session). This page IS the public route that
                  // already exists for checking a request's status — a real
                  // reload re-runs its own loader (getPublicOrderByNumber)
                  // instead of a same-URL Link, which React Router would
                  // just no-op on.
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => window.location.reload()}
                  >
                    Ver estado de mi solicitud
                  </button>
                )}
                <Button to="/servicios" variant="secondary" block>
                  Explorar otros servicios
                </Button>
                <Button
                  to="/contacto"
                  variant="ghost"
                  block
                  className="quote-confirmation-actions__text-link"
                >
                  Contactar a Ideas Estudio
                </Button>
              </div>
            </article>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title={`Orden ${order.orderNumber}`}
        subtitle="Aquí puedes revisar el estado actual de tu pedido y el resumen de lo contratado."
        primaryAction={
          <Button to="/servicios">Contratar otro servicio</Button>
        }
        secondaryAction={
          <Button to="/servicios" variant="secondary">
            Volver a servicios
          </Button>
        }
      />

      <section className="section">
        <div className="container detail-grid">
          <article className="detail-panel">
            <h2>Confirmación de la orden</h2>

            <div className="summary-row">
              <span>Número de orden</span>
              <strong>{order.orderNumber}</strong>
            </div>
            <div className="summary-row">
              <span>Email</span>
              <strong>{order.email}</strong>
            </div>
            <div className="summary-row">
              <span>Estado</span>
              <strong>{order.status}</strong>
            </div>
            <div className="summary-row">
              <span>Pago</span>
              <strong>{order.paymentStatus}</strong>
            </div>
            <div className="summary-row">
              <span>Entrega</span>
              <strong>{order.fulfillmentStatus}</strong>
            </div>
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatPrice(order.total, order.currency)}</strong>
            </div>

            {order.notes ? (
              <p className="detail-summary__note">
                <strong>Notas:</strong> {order.notes}
              </p>
            ) : null}
          </article>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Líneas</span>
              <strong>{order.summary.lineItems}</strong>
            </div>
            <div className="summary-row">
              <span>Cantidad total</span>
              <strong>{order.summary.totalQuantity}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(order.subtotal, order.currency)}</strong>
            </div>
            <div className="summary-row">
              <span>Origen</span>
              <strong>{order.source || "website_store"}</strong>
            </div>

            <div className="checkout-summary-list">
              {order.items.map((item) => (
                <div
                  key={item.id || item.productId}
                  className="checkout-summary-list__item"
                >
                  <strong>{item.snapshotName}</strong>
                  <span>
                    {item.quantity} x {formatPrice(item.unitPrice, item.product?.currency || order.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="detail-summary__actions">
              <Button to="/servicios" block>
                Ver más servicios
              </Button>
              <Button to="/servicios/carrito" variant="secondary" block>
                Revisar resumen
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
