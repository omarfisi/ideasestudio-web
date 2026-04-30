import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import {
  createPublicStorePaymentIntent,
  getPublicCart,
  getPublicOrderById,
  getStoredCartSessionToken,
  submitPublicLead,
  submitPublicStoreCheckout,
} from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";

const modeLabels = {
  buy: "Compra directa",
  booking: "Reserva con depósito",
  proposal: "Propuesta",
};

const submitLabels = {
  buy: "Registrar intención de compra",
  booking: "Registrar intención de reserva",
  proposal: "Registrar solicitud",
};

const stripePublishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
).trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ServiceIntentCheckout({
  formData,
  setFormData,
  submitState,
  setSubmitState,
  service,
  serviceSlug,
  clientType,
  pageOrigin,
  originCta,
  mode,
}) {
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({
      status: "loading",
      message: "Registrando intención comercial...",
    });

    try {
      const result = await submitPublicLead({
        ...formData,
        service,
        serviceSlug,
        clientType,
        mode,
        pageOrigin,
        originCta,
        submitCta: "checkout_form_submit",
        meta: {
          payment_method: formData.method,
        },
      });

      setSubmitState({
        status: "success",
        message:
          result.message ||
          "Tu intención quedó registrada mientras terminamos la integración de pagos.",
      });

      setFormData((current) => ({
        ...current,
        name: "",
        email: "",
        phone: "",
        message: "",
      }));
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la solicitud.",
      });
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Completa tu solicitud"
        subtitle="Comparte tus datos y el contexto de tu proyecto para continuar con una propuesta, reserva o compra de servicio."
      />

      <section className="section">
        <div className="container detail-grid">
          <form className="detail-panel" onSubmit={handleSubmit}>
            <h2>Datos del cliente</h2>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                />
              </label>

              <label className="field">
                <span>Teléfono</span>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Tu teléfono"
                />
              </label>

              <label className="field">
                <span>Método preferido</span>
                <select
                  name="method"
                  value={formData.method}
                  onChange={handleChange}
                >
                  <option value="card">Tarjeta</option>
                  <option value="deposit">Depósito</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </label>

              <label className="field field--full">
                <span>Notas o contexto</span>
                <textarea
                  rows="6"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Comparte fecha, volumen, urgencia, presupuesto o cualquier detalle importante."
                />
              </label>
            </div>

            {submitState.status !== "idle" ? (
              <p className={`form-status form-status--${submitState.status}`}>
                {submitState.message}
              </p>
            ) : null}

            <Button type="submit" disabled={submitState.status === "loading"}>
              {submitState.status === "loading"
                ? "Enviando..."
                : submitLabels[mode] || "Registrar solicitud"}
            </Button>
          </form>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Servicio</span>
              <strong>{service}</strong>
            </div>
            <div className="summary-row">
              <span>Modo</span>
              <strong>{modeLabels[mode] || "Compra directa"}</strong>
            </div>
            <div className="summary-row">
              <span>Canal</span>
              <strong>Seguimiento comercial</strong>
            </div>
            <div className="summary-row">
              <span>Referencia</span>
              <strong>{serviceSlug || "Servicio activo"}</strong>
            </div>

            <p className="detail-summary__note">
              Tu solicitud quedará registrada con el servicio consultado y el
              contexto necesario para continuar el seguimiento.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

function StoreCheckout({
  cart,
  checkoutForm,
  setCheckoutForm,
  submitState,
  setSubmitState,
  createdOrder,
  setCreatedOrder,
  paymentIntent,
  setPaymentIntent,
  completedOrder,
  setCompletedOrder,
}) {
  const canCreateOrder = !createdOrder?.id;

  function handleChange(event) {
    const { name, value } = event.target;

    setCheckoutForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function ensurePaymentIntent(order) {
    if (!order?.id) {
      throw new Error("No se pudo preparar el pago porque no existe la orden.");
    }

    const intent = await createPublicStorePaymentIntent({ orderId: order.id });
    if (!intent?.clientSecret) {
      throw new Error("No se pudo obtener el client_secret de Stripe.");
    }

    setPaymentIntent(intent);
    return intent;
  }

  async function ensureOrderPayable(orderId) {
    const latest = await getPublicOrderById(orderId);
    if (!latest?.id) {
      throw new Error("No se pudo validar la orden antes del pago.");
    }

    const paymentStatus = String(latest.paymentStatus || "").toLowerCase();
    const orderStatus = String(latest.status || "").toLowerCase();

    if (paymentStatus === "paid" || orderStatus === "paid") {
      throw new Error("Esta orden ya fue pagada.");
    }

    if (
      ["cancelled", "canceled", "refunded"].includes(orderStatus) ||
      ["cancelled", "canceled", "refunded"].includes(paymentStatus)
    ) {
      throw new Error("Esta orden no está disponible para pago.");
    }

    return latest;
  }

  async function handlePaymentSucceeded() {
    if (!createdOrder?.id) {
      return;
    }

    let latest = createdOrder;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const order = await getPublicOrderById(createdOrder.id);
        if (order) {
          latest = order;
        }
        if (order?.paymentStatus === "paid") {
          break;
        }
      } catch {
        // best-effort polling
      }
      await wait(900);
    }

    setCompletedOrder(latest);
    setSubmitState({
      status: "success",
      message:
        latest?.paymentStatus === "paid"
          ? "Pago confirmado y orden actualizada."
          : "Pago confirmado en Stripe. La confirmación final puede tardar unos segundos.",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitState({
        status: "loading",
        message: canCreateOrder
          ? "Creando orden y preparando pago..."
          : "Preparando intento de pago...",
      });

      if (!canCreateOrder && createdOrder?.id) {
        const latestOrder = await ensureOrderPayable(createdOrder.id);
        setCreatedOrder(latestOrder);
        await ensurePaymentIntent(latestOrder);
        setSubmitState({
          status: "success",
          message: "Intento de pago listo. Completa los datos de tu tarjeta.",
        });
        return;
      }

      const result = await submitPublicStoreCheckout({
        sessionToken: cart.sessionToken,
        name: checkoutForm.name,
        email: checkoutForm.email,
        phone: checkoutForm.phone,
        company: checkoutForm.company,
        notes: checkoutForm.notes,
      });

      if (!result?.order?.id) {
        throw new Error("No se pudo crear la orden de checkout.");
      }

      const latestOrder = await ensureOrderPayable(result.order.id);
      setCreatedOrder(latestOrder);
      await ensurePaymentIntent(latestOrder);
      setSubmitState({
        status: "success",
        message: "Orden creada. Completa el pago con tarjeta.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo completar el checkout.",
      });
    }
  }

  if (completedOrder) {
    return (
      <>
        <PageHero
          eyebrow="Servicios"
          title="Pago completado"
          subtitle="Tu pago fue confirmado y la orden quedó registrada para seguimiento."
        />

        <section className="section">
          <div className="container detail-grid">
            <article className="detail-panel">
              <h2>Resumen de la orden</h2>
              <div className="summary-row">
                <span>Número</span>
                <strong>{completedOrder.orderNumber}</strong>
              </div>
              <div className="summary-row">
                <span>Email</span>
                <strong>{completedOrder.email}</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>
                  {formatPrice(completedOrder.total, completedOrder.currency)}
                </strong>
              </div>
              <div className="summary-row">
                <span>Estado de pago</span>
                <strong>{completedOrder.paymentStatus}</strong>
              </div>

              {submitState.status !== "idle" ? (
                <p className={`form-status form-status--${submitState.status}`}>
                  {submitState.message}
                </p>
              ) : null}
            </article>

            <aside className="detail-summary">
              <div className="detail-summary__actions">
                <Button
                  to={`/servicios/ordenes/${completedOrder.orderNumber}`}
                  block
                >
                  Ver confirmación
                </Button>
                <Button to="/servicios" block>
                  Volver a servicios
                </Button>
                <Button to="/servicios" variant="secondary" block>
                  Ver servicios
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
        title="Finaliza tu pedido"
        subtitle="Confirma tus datos, crea la orden y completa el pago con tarjeta mediante Stripe."
      />

      <section className="section">
        <div className="container detail-grid">
          <form className="detail-panel" onSubmit={handleSubmit}>
            <h2>Datos para tu orden</h2>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  name="name"
                  value={checkoutForm.name}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  required
                  disabled={!canCreateOrder}
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={checkoutForm.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  disabled={!canCreateOrder}
                />
              </label>

              <label className="field">
                <span>Teléfono</span>
                <input
                  type="text"
                  name="phone"
                  value={checkoutForm.phone}
                  onChange={handleChange}
                  placeholder="Teléfono de contacto"
                  disabled={!canCreateOrder}
                />
              </label>

              <label className="field">
                <span>Empresa</span>
                <input
                  type="text"
                  name="company"
                  value={checkoutForm.company}
                  onChange={handleChange}
                  placeholder="Empresa opcional"
                  disabled={!canCreateOrder}
                />
              </label>

              <label className="field field--full">
                <span>Notas</span>
                <textarea
                  rows="6"
                  name="notes"
                  value={checkoutForm.notes}
                  onChange={handleChange}
                  placeholder="Notas sobre entrega, acceso o cualquier detalle adicional."
                  disabled={!canCreateOrder}
                />
              </label>
            </div>

            {submitState.status !== "idle" ? (
              <p className={`form-status form-status--${submitState.status}`}>
                {submitState.message}
              </p>
            ) : null}

            <Button type="submit" disabled={submitState.status === "loading" || !canCreateOrder && Boolean(paymentIntent?.clientSecret)}>
              {submitState.status === "loading"
                ? canCreateOrder
                  ? "Creando orden..."
                  : "Preparando pago..."
                : canCreateOrder
                ? "Crear orden y continuar al pago"
                : paymentIntent?.clientSecret
                ? "Orden lista para pagar"
                : "Generar intento de pago"}
            </Button>

            {createdOrder ? (
              <p className="detail-summary__note">
                Orden creada: <strong>{createdOrder.orderNumber}</strong>. Completa
                el pago en el panel de la derecha.
              </p>
            ) : null}
          </form>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Líneas</span>
              <strong>{cart.summary.lineItems}</strong>
            </div>
            <div className="summary-row">
              <span>Cantidad total</span>
              <strong>{cart.summary.totalQuantity}</strong>
            </div>
            <div className="summary-row">
              <span>Total</span>
              <strong>
                {formatPrice(cart.summary.subtotal, cart.summary.currency)}
              </strong>
            </div>
            <div className="summary-row">
              <span>Resultado</span>
              <strong>
                {paymentIntent?.clientSecret
                  ? "Lista para cobro con Stripe"
                  : "Se creará una orden para pago"}
              </strong>
            </div>

            <div className="checkout-summary-list">
              {cart.items.map((item) => (
                <div key={item.id || item.productId} className="checkout-summary-list__item">
                  <strong>{item.snapshotName}</strong>
                  <span>
                    {item.quantity} x {formatPrice(item.unitPrice, item.currency)}
                  </span>
                </div>
              ))}
            </div>

            {paymentIntent?.clientSecret ? (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <StoreCardPaymentForm
                    clientSecret={paymentIntent.clientSecret}
                    order={createdOrder}
                    checkoutForm={checkoutForm}
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
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}

function StoreCardPaymentForm({
  clientSecret,
  order,
  checkoutForm,
  submitState,
  setSubmitState,
  onPaymentSucceeded,
}) {
  const stripe = useStripe();
  const elements = useElements();

  async function handleCardPayment(event) {
    event.preventDefault();

    if (!stripe || !elements) {
      setSubmitState({
        status: "error",
        message: "Stripe todavía no está listo. Intenta nuevamente en unos segundos.",
      });
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setSubmitState({
        status: "error",
        message: "No se pudo cargar el campo de tarjeta.",
      });
      return;
    }

    setSubmitState({
      status: "loading",
      message: "Procesando pago con tarjeta...",
    });

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: checkoutForm.name || undefined,
            email: checkoutForm.email || undefined,
            phone: checkoutForm.phone || undefined,
          },
        },
      });

      if (result.error) {
        setSubmitState({
          status: "error",
          message: result.error.message || "No se pudo confirmar el pago.",
        });
        return;
      }

      const status = result.paymentIntent?.status;
      if (status === "succeeded") {
        await onPaymentSucceeded();
        return;
      }

      if (status === "requires_action") {
        setSubmitState({
          status: "error",
          message:
            "La tarjeta requiere autenticación adicional. Completa el flujo de verificación e intenta nuevamente.",
        });
        return;
      }

      if (status === "processing") {
        setSubmitState({
          status: "success",
          message: "Tu pago está en procesamiento. Te confirmaremos el resultado en breve.",
        });
        return;
      }

      setSubmitState({
        status: "error",
        message: `El pago no se completó. Estado actual: ${status || "desconocido"}.`,
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error de conexión. Intenta nuevamente.",
      });
    }
  }

  return (
    <form className="detail-panel" onSubmit={handleCardPayment}>
      <h3>Pagar con tarjeta</h3>
      <p className="detail-summary__note">
        Orden: <strong>{order?.orderNumber || "pendiente"}</strong>
      </p>
      <div className="field field--full">
        <span>Tarjeta</span>
        <div className="input" style={{ padding: "12px 14px" }}>
          <CardElement options={{ hidePostalCode: false }} />
        </div>
      </div>

      <Button type="submit" disabled={!stripe || submitState.status === "loading"} block>
        {submitState.status === "loading" ? "Procesando pago..." : "Pagar ahora"}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get("service") || "Servicio pendiente";
  const serviceSlug = searchParams.get("serviceSlug") || "";
  const clientType = searchParams.get("clientType") || "";
  const pageOrigin = searchParams.get("pageOrigin") || "";
  const originCta = searchParams.get("cta") || "";
  const mode = searchParams.get("mode") || "buy";
  const querySessionToken = searchParams.get("sessionToken") || "";
  const activeSessionToken =
    querySessionToken || getStoredCartSessionToken() || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    method: mode === "booking" ? "deposit" : "card",
    message: "",
  });
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [submitState, setSubmitState] = useState({
    status: "idle",
    message: "",
  });
  const [cart, setCart] = useState(null);
  const [cartState, setCartState] = useState({
    status: activeSessionToken ? "loading" : "idle",
    message: "",
  });
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  const isStoreCheckout = useMemo(
    () => Boolean(activeSessionToken && !serviceSlug),
    [activeSessionToken, serviceSlug]
  );

  useEffect(() => {
    if (!isStoreCheckout) {
      return undefined;
    }

    let cancelled = false;

    async function loadCart() {
      setCreatedOrder(null);
      setPaymentIntent(null);
      setCompletedOrder(null);
      setCartState({
        status: "loading",
        message: "",
      });

      try {
        const result = await getPublicCart(activeSessionToken);

        if (!cancelled) {
          setCart(result);
          setCheckoutForm((current) => ({
            ...current,
            email: current.email || result?.email || "",
          }));
          setCartState({
            status: "idle",
            message: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setCart(null);
          setCartState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el resumen para checkout.",
          });
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [activeSessionToken, isStoreCheckout]);

  if (isStoreCheckout) {
    if (cartState.status === "loading") {
      return (
        <>
          <PageHero
            eyebrow="Servicios"
            title="Preparando el checkout"
            subtitle="Estamos cargando tu resumen de contratación para que puedas completar el pedido."
          />
          <section className="section">
            <div className="container">
              <div className="empty-state">
                <h2>Cargando resumen...</h2>
              </div>
            </div>
          </section>
        </>
      );
    }

    if (!cart || !cart.items.length) {
      return (
        <>
          <PageHero
            eyebrow="Servicios"
            title="No hay servicios listos para contratar"
            subtitle="Necesitas servicios en tu resumen antes de continuar al checkout."
          />
          <section className="section">
            <div className="container">
              <div className="empty-state">
                <h2>Tu resumen no está listo para checkout</h2>
                <p>
                  {cartState.message ||
                    "Agrega servicios desde el catálogo antes de continuar."}
                </p>
                <div className="empty-state__actions">
                  <Button to="/servicios">Ir a servicios</Button>
                  <Button to="/servicios/carrito" variant="secondary">
                    Revisar resumen
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      );
    }

    return (
      <StoreCheckout
        cart={cart}
        checkoutForm={checkoutForm}
        setCheckoutForm={setCheckoutForm}
        submitState={submitState}
        setSubmitState={setSubmitState}
        createdOrder={createdOrder}
        setCreatedOrder={setCreatedOrder}
        paymentIntent={paymentIntent}
        setPaymentIntent={setPaymentIntent}
        completedOrder={completedOrder}
        setCompletedOrder={setCompletedOrder}
      />
    );
  }

  return (
    <ServiceIntentCheckout
      formData={formData}
      setFormData={setFormData}
      submitState={submitState}
      setSubmitState={setSubmitState}
      service={service}
      serviceSlug={serviceSlug}
      clientType={clientType}
      pageOrigin={pageOrigin}
      originCta={originCta}
      mode={mode}
    />
  );
}
