import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { formatPrice } from "@/lib/formatPrice.js";

export default function OrderConfirmationPage() {
  const { order } = useLoaderData();

  if (!order) {
    return (
      <>
        <PageHero
          eyebrow="Servicios"
          title="Orden no encontrada"
          subtitle="La confirmacion que buscas no existe o todavia no esta disponible en el sistema publico."
        />

        <section className="section">
          <div className="container">
            <div className="empty-state">
              <h2>No pudimos cargar esa orden</h2>
              <p>
                Verifica el numero de orden o vuelve a productos para retomar el
                flujo comercial.
              </p>
              <div className="empty-state__actions">
                <Button to="/servicios/productos">Ir a productos</Button>
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

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title={`Orden ${order.orderNumber}`}
        subtitle="Esta vista publica resume la orden creada desde checkout y deja el resultado listo para soporte, seguimiento y futuras automatizaciones."
        primaryAction={<Button to="/servicios/productos">Seguir comprando</Button>}
        secondaryAction={
          <Button to="/servicios" variant="secondary">
            Volver a servicios
          </Button>
        }
      />

      <section className="section">
        <div className="container detail-grid">
          <article className="detail-panel">
            <h2>Confirmacion de la orden</h2>

            <div className="summary-row">
              <span>Numero de orden</span>
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
              <span>Lineas</span>
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
              <Button to="/servicios/productos" block>
                Volver a productos
              </Button>
              <Button to="/servicios/carrito" variant="secondary" block>
                Revisar carrito
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
