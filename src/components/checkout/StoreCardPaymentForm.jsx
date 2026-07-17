import { CardCvcElement, CardExpiryElement, CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js";

/**
 * Shared Stripe Elements card form — used by both the guest/first checkout
 * (CheckoutPage.jsx) and by AccountOrderPaymentPage.jsx (resuming payment on
 * an existing order from "Mis órdenes"). Confirms clientSecret against
 * whatever card the customer enters; never sees or transmits the raw card
 * number outside Stripe Elements.
 */
export default function StoreCardPaymentForm({
  clientSecret,
  order,
  billingDetails,
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

    const card = elements.getElement(CardNumberElement);
    if (!card) {
      setSubmitState({ status: "error", message: "No se pudo cargar el campo de tarjeta." });
      return;
    }

    setSubmitState({ status: "loading", message: "Procesando pago con tarjeta..." });

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: billingDetails?.name || undefined,
            email: billingDetails?.email || undefined,
            phone: billingDetails?.phone || undefined,
          },
        },
      });

      if (result.error) {
        setSubmitState({ status: "error", message: result.error.message || "No se pudo confirmar el pago." });
        return;
      }

      const status = result.paymentIntent?.status;
      if (status === "succeeded") { await onPaymentSucceeded(); return; }
      if (status === "requires_action") {
        setSubmitState({ status: "error", message: "La tarjeta requiere autenticación adicional. Completa el flujo de verificación e intenta nuevamente." });
        return;
      }
      if (status === "processing") {
        setSubmitState({ status: "success", message: "Tu pago está en procesamiento. Te confirmaremos el resultado en breve." });
        return;
      }
      setSubmitState({ status: "error", message: `El pago no se completó. Estado actual: ${status || "desconocido"}.` });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Error de conexión. Intenta nuevamente.",
      });
    }
  }

  const stripeFieldStyle = {
    base: {
      fontSize: "16px",
      color: "#1a1a1a",
      fontFamily: "inherit",
      "::placeholder": { color: "#a0aec0" },
    },
    invalid: { color: "#e53e3e" },
  };

  return (
    <form id="checkout-stripe-form" onSubmit={handleCardPayment}>
      <p className="checkout-order-ref" style={{ marginBottom: 20 }}>
        Orden: <strong>{order?.orderNumber || "pendiente"}</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Número de tarjeta */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
            Número de tarjeta
          </label>
          <div className="checkout-stripe-field">
            <CardNumberElement options={{ style: stripeFieldStyle, showIcon: true }} />
          </div>
        </div>

        {/* Vencimiento + CVC */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
              Vencimiento
            </label>
            <div className="checkout-stripe-field">
              <CardExpiryElement options={{ style: stripeFieldStyle }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}>
              CVC
            </label>
            <div className="checkout-stripe-field">
              <CardCvcElement options={{ style: stripeFieldStyle }} />
            </div>
          </div>
        </div>
      </div>

      {submitState.status === "error" ? (
        <p className="form-status form-status--error" style={{ marginTop: 16 }}>{submitState.message}</p>
      ) : null}
      {/* Button rendered by the caller's footer via form="checkout-stripe-form" */}
    </form>
  );
}
