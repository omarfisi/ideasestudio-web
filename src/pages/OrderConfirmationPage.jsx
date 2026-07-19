import { useLoaderData, useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { formatPrice } from "@/lib/formatPrice.js";
import { resolveQuoteConfirmationContext } from "@/lib/bookingCheckoutSteps.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

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
    return (
      <>
        <PageHero
          eyebrow="Servicios"
          title="Solicitud de cotización recibida"
          subtitle="Recibimos tu solicitud correctamente."
        />

        <section className="section">
          <div className="container detail-grid">
            <article className="detail-panel">
              <h2>Solicitud de cotización recibida</h2>
              <p>Recibimos tu solicitud correctamente.</p>
              <p>
                Te enviamos una propuesta al correo electrónico que utilizaste en la
                orden. Revisa también la carpeta de correo no deseado.
              </p>

              <div className="summary-row">
                <span>Número de orden</span>
                <strong>{order.orderNumber}</strong>
              </div>
              {checkoutState?.customerName ? (
                <div className="summary-row">
                  <span>Nombre</span>
                  <strong>{checkoutState.customerName}</strong>
                </div>
              ) : null}
              <div className="summary-row">
                <span>Email</span>
                <strong>{order.email}</strong>
              </div>
              <div className="summary-row">
                <span>Total estimado</span>
                <strong>{formatPrice(order.total, order.currency)}</strong>
              </div>
            </article>

            <aside className="detail-summary">
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
                {session && order.id ? (
                  // Authenticated: the real order-detail page (document_
                  // type/proposal_id/invoice_id-aware, see orderPaymentState.js)
                  // — never this same confirmation URL, which would be a
                  // circular "Ver mi orden" that just reloads this page.
                  <Button to={`/mi-cuenta/ordenes/${order.id}`} block>
                    Ver mi orden
                  </Button>
                ) : (
                  // Guest: no authenticated order-detail page exists for
                  // them to navigate to (see AccountOrderDetailPage, which
                  // requires a session) — a real reload re-runs this page's
                  // loader instead of linking back to the exact URL already
                  // open.
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => window.location.reload()}
                  >
                    Actualizar estado
                  </button>
                )}
                <Button to="/servicios" variant="secondary" block>
                  Volver a la tienda
                </Button>
                <Button to="/contacto" variant="secondary" block>
                  Contactar a Ideas Estudio
                </Button>
              </div>
            </aside>
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
