import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import {
  getPublicCart,
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
  completedOrder,
  setCompletedOrder,
}) {
  function handleChange(event) {
    const { name, value } = event.target;

    setCheckoutForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({
      status: "loading",
      message: "Creando orden y cerrando checkout...",
    });

    try {
      const result = await submitPublicStoreCheckout({
        sessionToken: cart.sessionToken,
        name: checkoutForm.name,
        email: checkoutForm.email,
        phone: checkoutForm.phone,
        company: checkoutForm.company,
        notes: checkoutForm.notes,
      });

      setCompletedOrder(result.order);
      setSubmitState({
        status: "success",
        message: result.warnings.length
          ? result.warnings.join(" ")
          : "Orden creada correctamente.",
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
          title="Tu pedido fue registrado"
          subtitle="La orden quedó creada correctamente y ya está lista para seguimiento."
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
                <Button to="/servicios/productos" block>
                  Volver a productos
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
        subtitle="Confirma tus datos para crear la orden y continuar con el seguimiento de tu compra."
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
                ? "Creando orden..."
                : "Completar pedido"}
            </Button>
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
              <strong>Se creará una orden para seguimiento</strong>
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
          </aside>
        </div>
      </section>
    </>
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
                : "No se pudo cargar el carrito para checkout.",
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
            subtitle="Estamos cargando tu carrito para que puedas completar el pedido."
          />
          <section className="section">
            <div className="container">
              <div className="empty-state">
                <h2>Cargando carrito...</h2>
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
            title="No hay productos listos para comprar"
            subtitle="Necesitas productos en tu carrito antes de continuar al checkout."
          />
          <section className="section">
            <div className="container">
              <div className="empty-state">
                <h2>Tu carrito no está listo para comprar</h2>
                <p>
                  {cartState.message ||
                    "Agrega productos desde el catálogo antes de continuar."}
                </p>
                <div className="empty-state__actions">
                  <Button to="/servicios/productos">Ir a productos</Button>
                  <Button to="/servicios/carrito" variant="secondary">
                    Revisar carrito
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
