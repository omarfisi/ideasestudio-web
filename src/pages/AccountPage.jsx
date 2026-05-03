import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import PageHero from "@/components/shared/PageHero.jsx";
import Button from "@/components/shared/Button.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { getMyOrders } from "@/lib/accountApi.js";
import { formatPrice } from "@/lib/formatPrice.js";

const paymentStatusLabel = {
  paid: "Pagado",
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const documentTypeLabel = {
  invoice: "Factura",
  proposal: "Propuesta",
};

function OrderRow({ order }) {
  const total = formatPrice(order.grand_total ?? order.total ?? 0, order.currency || "USD");
  const paymentLabel = paymentStatusLabel[order.payment_status] || order.payment_status || "—";
  const docLabel = documentTypeLabel[order.document_type] || null;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-800">
        <Link
          to={`/mi-cuenta/ordenes/${order.id}`}
          className="text-blue-600 hover:underline"
        >
          {order.order_number || "—"}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-600">{total}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            order.payment_status === "paid"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {paymentLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">
        {docLabel ? (
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs">
            {docLabel}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">
        {order.created_at ? new Date(order.created_at).toLocaleDateString("es-PR") : "—"}
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/mi-cuenta/ordenes/${order.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Ver detalle
        </Link>
      </td>
    </tr>
  );
}

export default function AccountPage() {
  const { session, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState({ status: "loading", message: "" });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function load() {
      setOrdersState({ status: "loading", message: "" });
      try {
        const data = await getMyOrders();
        if (!cancelled) {
          setOrders(data.items || []);
          setOrdersState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setOrdersState({
            status: "error",
            message: error instanceof Error ? error.message : "No se pudieron cargar las órdenes.",
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session]);

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

  const userEmail = session.user?.email || "";

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <>
      <PageHero
        eyebrow="Mi cuenta"
        title="Mis órdenes"
        subtitle="Consulta el estado de tus servicios contratados, facturas y propuestas."
      />

      <section className="section">
        <div className="container">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Sesión activa: <strong>{userEmail}</strong>
            </p>
            <Button onClick={handleSignOut} variant="secondary">
              Cerrar sesión
            </Button>
          </div>

          {ordersState.status === "loading" ? (
            <div className="empty-state"><p>Cargando órdenes...</p></div>
          ) : ordersState.status === "error" ? (
            <div className="empty-state">
              <p className="form-status form-status--error">{ordersState.message}</p>
            </div>
          ) : !orders.length ? (
            <div className="empty-state">
              <h2>No tienes órdenes todavía</h2>
              <p>Cuando contrates un servicio, aparecerá aquí.</p>
              <div className="empty-state__actions">
                <Button to="/servicios">Ver servicios</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
