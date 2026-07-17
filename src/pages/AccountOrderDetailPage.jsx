import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { getMyOrderDetail } from "@/lib/accountApi.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { getOrderPaymentAction, mapOrderPaymentErrorMessage } from "@/lib/orderPaymentState.js";

const serviceStatusLabel = {
  pending: "Servicio pendiente",
  confirmed: "Servicio confirmado",
  in_progress: "Servicio en progreso",
  delivered: "Servicio entregado",
  cancelled: "Servicio cancelado",
};

export default function AccountOrderDetailPage() {
  const { orderId } = useParams();
  const { session, loading } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ status: "loading", message: "" });

  useEffect(() => {
    if (!session || !orderId) return;

    let cancelled = false;

    async function load() {
      setState({ status: "loading", message: "" });
      try {
        const data = await getMyOrderDetail(orderId);
        if (!cancelled) {
          setOrder(data.item || null);
          setItems(data.item?.items || []);
          setState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          const code = error instanceof Error ? error.message : null;
          setState({ status: "error", message: mapOrderPaymentErrorMessage(code) });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session, orderId]);

  if (loading) {
    return (
      <div className="account-dashboard-bg">
        <div className="account-loading">Verificando sesión…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate replace to="/mi-cuenta/login" />;
  }

  const currency = order?.currency || "USD";
  const paymentAction = order ? getOrderPaymentAction(order) : null;
  const serviceLabel = order ? serviceStatusLabel[order.service_status] || order.service_status || "—" : "—";
  const hasDocument = Boolean(order?.invoice_id || order?.proposal_id);

  return (
    <div className="account-dashboard-bg">
      <section className="account-dashboard-card order-detail-card">
        <div className="account-topbar">
          <div className="account-breadcrumb">
            <Link to="/mi-cuenta">Mi cuenta</Link>
            <span>›</span>
            <strong>Detalle de la orden</strong>
          </div>
          <a className="account-support-btn" href="/contacto">Soporte</a>
        </div>

        <div className="order-detail-shell">
          <Link to="/mi-cuenta" className="order-detail-link-back">
            ← Volver a mis órdenes
          </Link>

          {state.status === "loading" ? (
            <div className="account-loading">Cargando orden…</div>
          ) : state.status === "error" ? (
            <div className="account-empty-state">
              <h3>No pudimos cargar esta orden</h3>
              <p>{state.message}</p>
            </div>
          ) : !order ? (
            <div className="account-empty-state">
              <h3>No encontramos esta orden</h3>
            </div>
          ) : (
            <>
              {/* ── Cabecera de estado ──────────────────────────────────── */}
              <div className="order-detail-head">
                <div className="order-detail-head__badges">
                  <span className={`order-detail-badge order-detail-badge--${paymentAction.kind}`}>
                    {paymentAction.badgeLabel}
                  </span>
                  <span className="order-detail-badge order-detail-badge--neutral">{serviceLabel}</span>
                </div>
                <div className="order-detail-head__figures">
                  <div>
                    <span>Total</span>
                    <strong>{formatPrice(order.grand_total ?? order.total ?? 0, currency)}</strong>
                  </div>
                  <div>
                    <span>Fecha</span>
                    <strong>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("es-PR") : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ── Bloque destacado: acción pendiente ─────────────────── */}
              {paymentAction.kind === "payable" || paymentAction.kind === "retryable" ? (
                <div className="order-detail-cta-block">
                  <div>
                    <h2>Tu pago está pendiente</h2>
                    <p>Completa el pago para confirmar el servicio y generar tus documentos.</p>
                  </div>
                  <div className="order-detail-cta-block__actions">
                    <Link to={`/mi-cuenta/ordenes/${orderId}/pagar`} className="order-detail-pay-button">
                      {paymentAction.ctaLabel}
                    </Link>
                    <a href="/contacto" className="checkout-secondary-button">Contactar a Ideas Estudio</a>
                  </div>
                </div>
              ) : paymentAction.message ? (
                <div className="order-detail-notice">
                  <p>{paymentAction.message}</p>
                  <a href="/contacto" className="checkout-secondary-button">Contactar a Ideas Estudio</a>
                </div>
              ) : null}

              {/* ── Contenido en 2 columnas ─────────────────────────────── */}
              <div className="order-detail-grid">
                <div className="order-detail-main">
                  {items.length > 0 ? (
                    <div className="order-detail-panel">
                      <h3>Servicio contratado</h3>
                      <div className="order-detail-items">
                        {items.map((item, idx) => (
                          <div className="order-detail-item" key={item.id || idx}>
                            <div>
                              <strong>{item.name_snapshot || "—"}</strong>
                              <span>Cantidad: {item.quantity || 1}</span>
                            </div>
                            <span className="order-detail-item__price">
                              {formatPrice(item.line_total ?? item.price_snapshot ?? 0, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="order-detail-panel">
                    <h3>Documentos</h3>
                    {!hasDocument ? (
                      <p className="order-detail-muted">
                        {paymentAction.kind === "paid"
                          ? "Los documentos se están generando. Actualiza en unos minutos."
                          : "Tu factura se generará automáticamente cuando se confirme el pago."}
                      </p>
                    ) : (
                      <div className="order-detail-docs">
                        {order.invoice_id ? (
                          <div className="order-detail-doc-chip">
                            <span>Factura</span>
                            <small>
                              Generada el{" "}
                              {order.document_created_at
                                ? new Date(order.document_created_at).toLocaleDateString("es-PR")
                                : "—"}
                            </small>
                          </div>
                        ) : null}
                        {order.proposal_id ? (
                          <div className="order-detail-doc-chip">
                            <span>Propuesta</span>
                            <small>
                              Generada el{" "}
                              {order.document_created_at
                                ? new Date(order.document_created_at).toLocaleDateString("es-PR")
                                : "—"}
                            </small>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="order-detail-side">
                  <div className="order-detail-panel">
                    <h3>Resumen de orden</h3>
                    <div className="summary-row">
                      <span>Orden</span>
                      <strong>{order.order_number || "—"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Email</span>
                      <strong>{order.customer_email || "—"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Total</span>
                      <strong>{formatPrice(order.grand_total ?? order.total ?? 0, currency)}</strong>
                    </div>
                    {order.service_date ? (
                      <div className="summary-row">
                        <span>Fecha del servicio</span>
                        <strong>{new Date(order.service_date).toLocaleDateString("es-PR")}</strong>
                      </div>
                    ) : null}

                    {paymentAction.kind === "payable" || paymentAction.kind === "retryable" ? (
                      <Link to={`/mi-cuenta/ordenes/${orderId}/pagar`} className="order-detail-pay-button order-detail-pay-button--block">
                        {paymentAction.ctaLabel}
                      </Link>
                    ) : null}
                  </div>
                </aside>
              </div>

              <div className="order-detail-footer">
                <Link to="/servicios" className="order-detail-explore-link">
                  Explorar otros servicios →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
