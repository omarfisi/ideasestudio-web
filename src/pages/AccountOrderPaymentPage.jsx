import { useEffect, useRef, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { getMyOrderDetail, postMyOrderPaymentSession } from "@/lib/accountApi.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { stripePromise } from "@/lib/stripeClient.js";
import { mapOrderPaymentErrorMessage, getOrderPaymentRecoveryAction } from "@/lib/orderPaymentState.js";
import StoreCardPaymentForm from "@/components/checkout/StoreCardPaymentForm.jsx";
import { clearStoredCartSessionToken } from "@/lib/api.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AccountOrderPaymentPage() {
  const { orderId } = useParams();
  const { session, loading } = useAuth();

  const [order, setOrder] = useState(null);
  const [orderState, setOrderState] = useState({ status: "loading", message: "" });
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [sessionState, setSessionState] = useState({ status: "idle", message: "", errorCode: null });
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const [paidElsewhere, setPaidElsewhere] = useState(false);

  // useRef (not state) so it updates synchronously — same StrictMode-safe
  // pattern used by CheckoutPage.jsx's preparePaymentSession: prevents a
  // second payment-session request (and therefore a second reused/created
  // PaymentIntent) from React's double-invoke or a re-render.
  const sessionRequestRef = useRef({ running: false, completed: false });

  useEffect(() => {
    if (!session || !orderId) return;
    let cancelled = false;

    async function load() {
      setOrderState({ status: "loading", message: "" });
      try {
        const data = await getMyOrderDetail(orderId);
        if (!cancelled) {
          setOrder(data.item || null);
          setOrderState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          const code = error instanceof Error ? error.message : null;
          setOrderState({ status: "error", message: mapOrderPaymentErrorMessage(code) });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session, orderId]);

  async function preparePaymentSession() {
    if (sessionRequestRef.current.running || sessionRequestRef.current.completed) return;
    sessionRequestRef.current.running = true;
    setSessionState({ status: "loading", message: "", errorCode: null });

    try {
      const result = await postMyOrderPaymentSession(orderId);
      setOrder((current) => (current ? { ...current, ...result.order } : result.order));
      setPaymentIntent({
        clientSecret: result.payment.client_secret,
        providerPaymentId: result.payment.provider_payment_id,
      });
      setSessionState({ status: "ready", message: "", errorCode: null });
      sessionRequestRef.current.completed = true;
    } catch (error) {
      const code = error instanceof Error ? error.message : null;
      if (code === "order_already_paid") {
        setPaidElsewhere(true);
        sessionRequestRef.current.completed = true;
      } else {
        sessionRequestRef.current.completed = false;
      }
      setSessionState({
        status: "error",
        message: mapOrderPaymentErrorMessage(code),
        errorCode: code,
      });
    } finally {
      sessionRequestRef.current.running = false;
    }
  }

  // Auto-starts the payment session the moment the order finishes loading —
  // no intermediate button, mirrors CheckoutPage.jsx's review-step behavior.
  useEffect(() => {
    if (!order || orderState.status !== "idle") return;
    if (paymentIntent?.clientSecret) return;
    preparePaymentSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, orderState.status]);

  async function handlePaymentSucceeded() {
    if (!orderId) return;
    let latest = order;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const data = await getMyOrderDetail(orderId);
        if (data?.item) latest = data.item;
        if (data?.item?.payment_status === "paid") break;
      } catch { /* best-effort */ }
      await wait(900);
    }
    setOrder(latest);
    clearStoredCartSessionToken();
    setSubmitState({
      status: "success",
      message: latest?.payment_status === "paid"
        ? "Pago confirmado y orden actualizada."
        : "Pago confirmado en Stripe. La confirmación final puede tardar unos segundos.",
    });
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

  const isPaidNow = paidElsewhere || order?.payment_status === "paid" || submitState.status === "success";
  const paymentReady = Boolean(paymentIntent?.clientSecret) && !isPaidNow;
  const currency = order?.currency || "USD";
  const amountDueNow = order?.amount_due_now ?? order?.grand_total ?? 0;
  const recoveryAction = sessionState.status === "error" ? getOrderPaymentRecoveryAction(sessionState.errorCode) : null;

  return (
    <div className="account-dashboard-bg">
      <section className="account-dashboard-card order-payment-card">
        <div className="account-topbar">
          <div className="account-breadcrumb">
            <Link to="/mi-cuenta">Mi cuenta</Link>
            <span>›</span>
            {order?.order_number ? (
              <Link to={`/mi-cuenta/ordenes/${orderId}`}>Orden {order.order_number}</Link>
            ) : (
              <span>Orden</span>
            )}
            <span>›</span>
            <strong>Pagar</strong>
          </div>
        </div>

        <div className="order-payment-shell">
          {orderState.status === "loading" ? (
            <div className="account-loading">Cargando orden…</div>
          ) : orderState.status === "error" ? (
            <div className="account-empty-state">
              <h3>No pudimos cargar esta orden</h3>
              <p>{orderState.message}</p>
              <Link to="/mi-cuenta" className="order-detail-link-back" style={{ marginTop: 12 }}>
                ← Volver a mis órdenes
              </Link>
            </div>
          ) : !order ? (
            <div className="account-empty-state">
              <h3>No encontramos esta orden</h3>
              <Link to="/mi-cuenta" className="order-detail-link-back" style={{ marginTop: 12 }}>
                ← Volver a mis órdenes
              </Link>
            </div>
          ) : (
            <>
              <Link to={`/mi-cuenta/ordenes/${orderId}`} className="order-detail-link-back">
                ← Volver al detalle de la orden
              </Link>

              <div className="order-payment-summary">
                <div>
                  <span>Orden</span>
                  <strong>{order.order_number || "—"}</strong>
                </div>
                <div>
                  <span>Total del servicio</span>
                  <strong>{formatPrice(order.grand_total ?? order.total ?? 0, currency)}</strong>
                </div>
                <div>
                  <span>A pagar ahora</span>
                  <strong>{formatPrice(amountDueNow, currency)}</strong>
                </div>
              </div>

              <div className="order-payment-panel">
                <h2>Pago seguro con tarjeta</h2>
                <p className="checkout-payment-intro">Aceptamos tarjetas de crédito y débito.</p>

                {isPaidNow ? (
                  <div className="order-payment-paid">
                    <p>Esta orden ya fue pagada.</p>
                    <Link to={`/mi-cuenta/ordenes/${orderId}`} className="checkout-secondary-button">
                      Ver detalle de la orden
                    </Link>
                  </div>
                ) : paymentReady ? (
                  stripePromise ? (
                    <Elements
                      key={paymentIntent.providerPaymentId || paymentIntent.clientSecret}
                      stripe={stripePromise}
                    >
                      <StoreCardPaymentForm
                        clientSecret={paymentIntent.clientSecret}
                        order={{ orderNumber: order.order_number }}
                        billingDetails={{
                          name: order.customer_name,
                          email: order.customer_email,
                          phone: order.customer_phone,
                        }}
                        submitState={submitState}
                        setSubmitState={setSubmitState}
                        onPaymentSucceeded={handlePaymentSucceeded}
                      />
                    </Elements>
                  ) : (
                    <p className="form-status form-status--error">
                      Falta `VITE_STRIPE_PUBLISHABLE_KEY` para inicializar Stripe en frontend.
                    </p>
                  )
                ) : recoveryAction?.kind === "booking_expired" ? (
                  <div className="order-payment-expired">
                    <span className="order-payment-expired__icon" aria-hidden="true">📅</span>
                    <div>
                      <h3>{recoveryAction.title}</h3>
                      <p>{recoveryAction.message}</p>
                    </div>
                    <div className="order-payment-expired__actions">
                      <Link to={`/mi-cuenta/ordenes/${orderId}/reprogramar`} className="order-detail-pay-button">
                        {recoveryAction.primaryLabel}
                      </Link>
                      <Link to={`/mi-cuenta/ordenes/${orderId}`} className="checkout-secondary-button">
                        Volver al detalle de la orden
                      </Link>
                    </div>
                  </div>
                ) : recoveryAction ? (
                  <div className="checkout-payment-error">
                    <p className="form-status form-status--error">{recoveryAction.message}</p>
                    {recoveryAction.retryAllowed && (
                      <button
                        type="button"
                        className="checkout-secondary-button"
                        onClick={() => preparePaymentSession()}
                      >
                        Intentar nuevamente
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="checkout-payment-preparing">
                    <span className="checkout-payment-spinner" aria-hidden="true" />
                    <div>
                      <p className="checkout-payment-preparing__title">Preparando tu pago seguro…</p>
                      <p className="checkout-payment-preparing__hint">Esto puede tomar unos segundos.</p>
                    </div>
                  </div>
                )}
              </div>

              {paymentReady && (
                <div className="order-payment-footer">
                  <button
                    type="submit"
                    form="checkout-stripe-form"
                    className="checkout-pay-button"
                    disabled={submitState.status === "loading"}
                  >
                    {submitState.status === "loading" ? "Procesando pago…" : "Pagar ahora"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
