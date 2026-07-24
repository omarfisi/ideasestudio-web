import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { getMyOrders } from "@/lib/accountApi.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { getOrderPaymentAction } from "@/lib/orderPaymentState.js";
import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import MyMembershipPanel from "@/components/account/MyMembershipPanel.jsx";
import CustomerProfilePanel from "@/components/account/CustomerProfilePanel.jsx";

const CRM_BASE_URL = (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") || "http://127.0.0.1:8000";

function money(order) {
  return formatPrice(order.grand_total ?? order.total ?? 0, order.currency || "USD");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getDocument(order) {
  if (order?.invoice_id) {
    return {
      label: "Factura",
      url: `${CRM_BASE_URL}/invoices/${order.invoice_id}/preview`,
      pdf: `${CRM_BASE_URL}/invoices/${order.invoice_id}/preview?format=pdf`,
    };
  }
  if (order?.proposal_id) {
    return {
      label: "Propuesta",
      url: `${CRM_BASE_URL}/proposals/${order.proposal_id}/preview`,
      pdf: `${CRM_BASE_URL}/proposals/${order.proposal_id}/preview?format=pdf`,
    };
  }
  return null;
}

const STEPS = ["Orden recibida", "Pago confirmado", "Documento listo", "En proceso", "Completado"];

function stepIndex(order, doc) {
  if (!order) return 0;
  const paid = order.payment_status === "paid";
  if (!paid) return 0;
  if (!doc) return 1;
  return 2;
}

export default function AccountPage() {
  const { session, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState({ status: "loading", message: "" });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("orders");

  // session?.user?.id (not the whole session object) — a token refresh
  // creates a new session object for the SAME user and must not re-trigger
  // this, but an actual user change (logout, or a different account
  // logging in on this same mounted page) must.
  const userId = session?.user?.id || null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Cleared unconditionally first — a logged-out user, or a second
      // account logging in right after the first (without a full page
      // reload), must never see the previous user's orders, not even
      // briefly while a new request is in flight.
      setOrders([]);

      if (!userId) {
        setOrdersState({ status: "idle", message: "" });
        return;
      }

      setOrdersState({ status: "loading", message: "" });
      try {
        const data = await getMyOrders();
        if (!cancelled) {
          setOrders(data.items || []);
          setOrdersState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          // Never surface a raw backend detail code (e.g. an old cached
          // customer_contact_not_found) — always a fixed, friendly message.
          if (import.meta.env.DEV) {
            console.error("[account] getMyOrders failed:", error);
          }
          setOrdersState({
            status: "error",
            message: "No pudimos cargar tus órdenes. Intenta nuevamente.",
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || String(order.order_number || "").toLowerCase().includes(q);
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" && order.payment_status === "paid") ||
        (filter === "pending" && order.payment_status !== "paid") ||
        (filter === "invoice" && Boolean(order.invoice_id)) ||
        (filter === "proposal" && Boolean(order.proposal_id));
      return matchesQuery && matchesFilter;
    });
  }, [orders, filter, query]);

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/mi-cuenta/login";
  }

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

  const userEmail = session.user?.email || "";

  if (!session) {
    return (
      <div className="account-dashboard-bg">
        <div className="account-shell">
          <div className="account-empty-card">
            <h1>Accede a tu cuenta</h1>
            <p>Inicia sesión para ver tus órdenes, facturas y propuestas.</p>
            <Link to="/mi-cuenta/login">Ir al login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-dashboard-bg">
      <section className="account-dashboard-card">

        {/* Topbar */}
        <div className="account-topbar">
          <div className="account-breadcrumb">
            <Link to="/">Inicio</Link>
            <span>›</span>
            <strong>Mi cuenta</strong>
          </div>
          <a className="account-support-btn" href="/contacto">
            Soporte
          </a>
        </div>

        {/* Grid */}
        <div className="account-dashboard-grid">

          {/* Sidebar */}
          <aside className="account-sidebar">
            <div className="account-user-card">
              <p>Hola,</p>
              <h2>{userEmail}</h2>
              <span>Cliente Ideas Estudio</span>
              <button onClick={handleSignOut}>Cerrar sesión</button>
            </div>

            <nav className="account-menu">
              <button
                className={activeSection === "orders" ? "is-active" : ""}
                onClick={() => setActiveSection("orders")}
              >
                Mis órdenes
              </button>
              <button
                className={activeSection === "invoices" ? "is-active" : ""}
                onClick={() => { setActiveSection("orders"); setFilter("invoice"); }}
              >
                Facturas
              </button>
              <button
                className={activeSection === "proposals" ? "is-active" : ""}
                onClick={() => { setActiveSection("orders"); setFilter("proposal"); }}
              >
                Propuestas
              </button>
              <button
                className={activeSection === "membership" ? "is-active" : ""}
                onClick={() => setActiveSection("membership")}
              >
                Mi membresía
              </button>
              <button
                className={activeSection === "profile" ? "is-active" : ""}
                onClick={() => setActiveSection("profile")}
              >
                Datos personales
              </button>
              <Link to="/mi-cuenta/reset-password">Cambiar contraseña</Link>
              <button disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>
                Privacidad
              </button>
            </nav>
          </aside>

          {/* Main content */}
          {activeSection === "membership" ? (
            <section className="account-main">
              <div className="account-main-head">
                <div>
                  <h1>Mi membresía</h1>
                  <p>Consulta el estado de tu membresía activa.</p>
                </div>
              </div>
              <MyMembershipPanel userId={session.user?.id} />
            </section>
          ) : activeSection === "profile" ? (
            <section className="account-main">
              <div className="account-main-head">
                <div>
                  <h1>Datos personales</h1>
                  <p>Actualiza tu nombre y teléfono de contacto.</p>
                </div>
              </div>
              <CustomerProfilePanel userId={session.user?.id} email={userEmail} />
            </section>
          ) : (
          <section className="account-main">
            <div className="account-main-head">
              <div>
                <h1>Mis órdenes</h1>
                <p>Consulta el estado de tus servicios, facturas y propuestas.</p>
              </div>
              <div className="account-search">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por número de orden"
                />
              </div>
            </div>

            <div className="account-filters">
              {[
                ["all", "Todas"],
                ["paid", "Pagadas"],
                ["pending", "Pendientes"],
                ["invoice", "Facturas"],
                ["proposal", "Propuestas"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={filter === key ? "is-active" : ""}
                >
                  {label}
                </button>
              ))}
            </div>

            {ordersState.status === "loading" ? (
              <div className="account-loading">Cargando órdenes…</div>
            ) : ordersState.status === "error" ? (
              <div className="account-empty-state">
                <h3>No pudimos cargar tus órdenes</h3>
                <p>{ordersState.message}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="account-empty-state">
                <h3>Aún no tienes órdenes.</h3>
                <p>Cuando contrates un servicio, aparecerá aquí.</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="account-empty-state">
                <h3>No hay órdenes para este filtro</h3>
                <p>Prueba con otra búsqueda o quita el filtro aplicado.</p>
              </div>
            ) : (
              <div className="account-orders-list">
                {filteredOrders.map((order) => {
                  const doc = getDocument(order);
                  const paid = order.payment_status === "paid";
                  // Reuses the same centralized classifier the order-detail
                  // page uses (getOrderPaymentAction) rather than a second
                  // paid/pending-only check here — a cancelled order must
                  // never read as "Pendiente" in this list.
                  const cancelled = getOrderPaymentAction(order).kind === "cancelled";
                  const done = stepIndex(order, doc);

                  return (
                    <article className="account-order-card" key={order.id}>
                      <div className="account-order-summary">
                        <div>
                          <span>Orden</span>
                          <strong>{order.order_number || "—"}</strong>
                        </div>
                        <div>
                          <span>Estado</span>
                          <strong
                            className={cancelled ? "status-cancelled" : paid ? "status-paid" : "status-pending"}
                          >
                            {cancelled ? "Cancelada" : paid ? "Pagado" : "Pendiente"}
                          </strong>
                        </div>
                        <div>
                          <span>Documento</span>
                          <strong>{doc?.label || "En preparación"}</strong>
                        </div>
                        <div>
                          <span>Total</span>
                          <strong>{money(order)}</strong>
                        </div>
                      </div>

                      <div className="account-progress">
                        {STEPS.map((step, index) => (
                          <div key={step} className={index <= done ? "is-done" : ""}>
                            <span />
                            <p>{step}</p>
                          </div>
                        ))}
                      </div>

                      <div className="account-order-footer">
                        <div>
                          <p>Fecha</p>
                          <strong>{formatDate(order.created_at)}</strong>
                        </div>
                        <div className="account-order-actions">
                          <Link to={`/mi-cuenta/ordenes/${order.id}`}>
                            Ver detalle
                          </Link>
                          {doc ? (
                            <>
                              <a href={doc.url} target="_blank" rel="noreferrer">
                                Ver {doc.label}
                              </a>
                              <a href={doc.pdf} target="_blank" rel="noreferrer">
                                Descargar PDF
                              </a>
                            </>
                          ) : (
                            <span>Documento en preparación</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          )}

        </div>
      </section>
    </div>
  );
}
