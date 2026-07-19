import { useLoaderData, useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { formatPrice } from "@/lib/formatPrice.js";

export default function OrderConfirmationPage() {
  const { order } = useLoaderData();
  const location = useLocation();
  // Only present on the very first render right after checkout (React
  // Router navigation state) — a page refresh or a shared/direct link to
  // this URL has none of this, and getPublicOrderByNumber's own response
  // has no sale_mode/payment_required field to fall back on (see
  // _fetch_order_bundle's explicit column list backend-side). That's a
  // known, accepted limitation: on refresh this page shows the generic
  // order view below, not the quote-specific one — never a false "paid"
  // claim either way, since paymentStatus for an unapproved quote is
  // never "paid".
  const checkoutState = location.state?.fromCheckout ? location.state : null;
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
                <Button to={`/servicios/ordenes/${order.orderNumber}`} block>
                  Ver mi orden
                </Button>
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
