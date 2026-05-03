import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import PageHero from "@/components/shared/PageHero.jsx";
import Button from "@/components/shared/Button.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { getMyOrderDetail } from "@/lib/accountApi.js";
import { formatPrice } from "@/lib/formatPrice.js";

const paymentStatusLabel = {
  paid: "Pagado",
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const serviceStatusLabel = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  in_progress: "En progreso",
  delivered: "Entregado",
  cancelled: "Cancelado",
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
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "No se pudo cargar la orden.",
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session, orderId]);

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state"><p>Verificando sesión...</p></div>
        </div>
      </section>
    );
  }

  if (!session) {
    return <Navigate replace to="/mi-cuenta/login" />;
  }

  const currency = order?.currency || "USD";

  return (
    <>
      <PageHero
        eyebrow="Mi cuenta"
        title={order?.order_number ? `Orden ${order.order_number}` : "Detalle de orden"}
        subtitle="Resumen de tu servicio, estado de pago y documentos."
      />

      <section className="section">
        <div className="container">
          <div className="mb-4">
            <Link to="/mi-cuenta" className="text-sm text-blue-600 hover:underline">
              ← Volver a mis órdenes
            </Link>
          </div>

          {state.status === "loading" ? (
            <div className="empty-state"><p>Cargando orden...</p></div>
          ) : state.status === "error" ? (
            <div className="empty-state">
              <p className="form-status form-status--error">{state.message}</p>
              <div className="empty-state__actions">
                <Button to="/mi-cuenta" variant="secondary">Volver</Button>
              </div>
            </div>
          ) : !order ? (
            <div className="empty-state">
              <h2>Orden no encontrada</h2>
              <div className="empty-state__actions">
                <Button to="/mi-cuenta" variant="secondary">Volver</Button>
              </div>
            </div>
          ) : (
            <div className="detail-grid">
              <div className="detail-panel space-y-6">

                {/* Estado de la orden */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Estado</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500">Pago</span>
                      <strong className={order.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"}>
                        {paymentStatusLabel[order.payment_status] || order.payment_status || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Servicio</span>
                      <strong>{serviceStatusLabel[order.service_status] || order.service_status || "—"}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Total</span>
                      <strong>{formatPrice(order.grand_total ?? order.total ?? 0, currency)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Fecha</span>
                      <strong>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString("es-PR")
                          : "—"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Líneas de la orden */}
                {items.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900">Servicios contratados</h3>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                        >
                          <div>
                            <strong className="block text-slate-800">{item.name_snapshot || "—"}</strong>
                            <span className="text-slate-500">Cantidad: {item.quantity || 1}</span>
                          </div>
                          <span className="font-medium text-slate-700">
                            {formatPrice(item.line_total ?? item.price_snapshot ?? 0, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Documentos */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Documentos</h3>
                  {!order.invoice_id && !order.proposal_id ? (
                    <p className="text-sm text-slate-500">
                      {order.payment_status === "paid"
                        ? "Los documentos se están generando. Actualiza en unos minutos."
                        : "Los documentos se generarán automáticamente cuando se confirme el pago."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {order.invoice_id ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <span className="block font-medium text-slate-800">Factura</span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Generada el{" "}
                            {order.document_created_at
                              ? new Date(order.document_created_at).toLocaleDateString("es-PR")
                              : "—"}
                          </span>
                        </div>
                      ) : null}
                      {order.proposal_id ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <span className="block font-medium text-slate-800">Propuesta</span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Generada el{" "}
                            {order.document_created_at
                              ? new Date(order.document_created_at).toLocaleDateString("es-PR")
                              : "—"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

              </div>

              <aside className="detail-summary">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Resumen</h3>
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

                <div className="detail-summary__actions mt-4">
                  <Button to="/servicios" block variant="secondary">
                    Ver más servicios
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
