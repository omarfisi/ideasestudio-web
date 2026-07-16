import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Button from "@/components/shared/Button.jsx";
import DynamicField from "@/components/forms/DynamicField.jsx";
import ServiceBookingCheckoutPanel from "@/components/checkout/ServiceBookingCheckoutPanel.jsx";
import BookingStepper from "@/components/checkout/BookingStepper.jsx";
import { getFormByPlacement, submitForm } from "@/lib/publicFormsApi.js";
import {
  clearStoredCartSessionToken,
  createPublicStorePaymentIntent,
  getPublicCart,
  getPublicOrderById,
  getStoredCartSessionToken,
  submitPublicLead,
  submitPublicStoreCheckout,
  validateStoreCoupon,
} from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";
import {
  buildSteps,
  isStepComplete,
  buildBookingSelectionField,
  mapBookingErrorMessage,
  mergeTrustedOrderTotals,
} from "@/lib/bookingCheckoutSteps.js";

const INITIAL_BOOKING_STATUS = {
  status: "loading",
  hasBooking: false,
  requiresCalendar: false,
  hasCustomization: false,
  scheduleComplete: false,
  customizationComplete: false,
  services: [],
};

const modeLabels = {
  buy: "Compra directa",
  booking: "Reserva con depósito",
};

const submitLabels = {
  buy: "Registrar intención de compra",
  booking: "Registrar intención de reserva",
};

const stripePublishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
).trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const storeCheckoutFormSectionKey = (
  import.meta.env.VITE_STORE_CHECKOUT_FORM_SECTION_KEY || "checkout_service_form"
).trim();

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && !value.trim()) return true;
  return false;
}

function parseCheckoutDataFromForm(fields, values) {
  const payload = {
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    details: {},
  };

  fields.forEach((field) => {
    if (!field || field.visible === false || field.type === "hidden") return;
    const rawValue = values[field.name];
    if (isEmptyValue(rawValue)) return;

    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    const target = normalizeToken(field.map_to || field.name);
    const label = field.label || field.name;

    if (["full_name", "name", "customer_name", "nombre"].includes(target)) {
      if (!payload.name) payload.name = String(value);
      return;
    }
    if (["email", "correo", "customer_email"].includes(target)) {
      if (!payload.email) payload.email = String(value);
      return;
    }
    if (["phone", "telefono", "tel", "customer_phone", "whatsapp"].includes(target)) {
      if (!payload.phone) payload.phone = String(value);
      return;
    }
    if (["business_name", "company", "empresa"].includes(target)) {
      if (!payload.company) payload.company = String(value);
      return;
    }
    if (["message", "notes", "note", "mensaje"].includes(target)) {
      if (!payload.notes) payload.notes = String(value);
      return;
    }

    payload.details[label] = value;
  });

  const detailEntries = Object.entries(payload.details);
  if (detailEntries.length) {
    const detailText = detailEntries
      .map(([label, value]) => `${label}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\n");
    payload.notes = payload.notes ? `${payload.notes}\n\n${detailText}` : detailText;
  }

  return payload;
}

function buildFormSubmissionPayload(formConfig, fields, values, cart) {
  const payload = {
    form_id: formConfig.form_id,
    placement_id: formConfig.placement_id || null,
    source: formConfig.source || "website_store_checkout",
    segments: Array.isArray(formConfig.segments) ? formConfig.segments : [],
    meta: {
      channel: "store_checkout",
      cart_session_token: cart?.sessionToken || null,
      cart_id: cart?.id || null,
      cart_subtotal: Number(cart?.summary?.subtotal || 0),
      cart_currency: cart?.summary?.currency || "USD",
      cart_line_items: Number(cart?.summary?.lineItems || 0),
    },
  };

  fields.forEach((field) => {
    if (!field || field.visible === false || field.type === "hidden") return;
    const value = values[field.name];
    if (isEmptyValue(value)) return;
    const target = field.map_to || field.name;
    payload[target] = value;
  });

  payload.submit_timestamp = Date.now();
  return payload;
}

function validateFormFields(fields, values) {
  const errors = {};
  fields.forEach((field) => {
    if (!field || field.visible === false || field.type === "hidden") return;
    const value = values[field.name];
    if (field.required && isEmptyValue(value)) {
      errors[field.name] = "Este campo es requerido.";
      return;
    }
    const type = normalizeToken(field.type);
    if ((type === "email" || normalizeToken(field.map_to) === "email") && !isEmptyValue(value)) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
        errors[field.name] = "Ingresa un email válido.";
      }
    }
  });
  return errors;
}

/* ─── Lock SVG ─────────────────────────────────────────────────────────── */
function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ─── Checkout stepper ──────────────────────────────────────────────────── */
function CheckoutHero({ activeStep = 2 }) {
  const steps = [
    { n: 1, label: "Carrito" },
    { n: 2, label: "Datos de checkout" },
    { n: 3, label: "Orden completada" },
  ];

  return (
    <div className="checkout-hero">
      <h1>Finaliza tu pedido</h1>
      <div className="checkout-steps">
        {steps.map((step, idx) => (
          <span key={step.n} style={{ display: "contents" }}>
            <span
              className={`checkout-step${step.n === activeStep ? " is-active" : ""}`}
            >
              <span className="checkout-step-number">{step.n}</span>
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span style={{ color: "#d4d4d8", fontWeight: 400 }}>→</span>
            )}
          </span>
        ))}
      </div>
      {activeStep < 3 && (
        <Link to="/servicios/carrito" className="checkout-back-link">
          ← Volver al carrito
        </Link>
      )}
    </div>
  );
}

/* ─── ServiceIntentCheckout ─────────────────────────────────────────────── */
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
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({ status: "loading", message: "Registrando intención comercial..." });

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
        meta: { payment_method: formData.method },
      });

      setSubmitState({
        status: "success",
        message:
          result.message ||
          "Tu intención quedó registrada mientras terminamos la integración de pagos.",
      });

      setFormData((current) => ({ ...current, name: "", email: "", phone: "", message: "" }));
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo registrar la solicitud.",
      });
    }
  }

  const isLoading = submitState.status === "loading";

  return (
    <div className="checkout-modern-page">
      <CheckoutHero activeStep={2} />

      <div className="checkout-modern-shell">
        <section>
          <div className="checkout-card">
            <h2>Datos de contratación</h2>
            <p>Completa la información necesaria para registrar tu solicitud de servicio.</p>

            <form onSubmit={handleSubmit}>
              <div className="checkout-form-grid">
                <div className="checkout-field">
                  <label>Nombre <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Tu nombre completo" required disabled={isLoading} />
                </div>
                <div className="checkout-field">
                  <label>Email <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" required disabled={isLoading} />
                </div>
                <div className="checkout-field">
                  <label>Teléfono</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+52 55 0000 0000" disabled={isLoading} />
                </div>
                <div className="checkout-field">
                  <label>Método preferido</label>
                  <select name="method" value={formData.method} onChange={handleChange} disabled={isLoading}>
                    <option value="card">Tarjeta</option>
                    <option value="deposit">Depósito</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div className="checkout-field is-full">
                  <label>Notas o contexto</label>
                  <textarea rows="5" name="message" value={formData.message} onChange={handleChange} placeholder="Comparte fecha, volumen, urgencia, presupuesto o cualquier detalle importante." disabled={isLoading} />
                </div>
              </div>

              {submitState.status !== "idle" && (
                <p className={`form-status form-status--${submitState.status}`} style={{ marginTop: 16 }}>
                  {submitState.message}
                </p>
              )}

              <div className="checkout-actions">
                <button type="submit" className="checkout-pay-button" style={{ flex: 1 }} disabled={isLoading}>
                  {isLoading ? "Enviando..." : submitLabels[mode] || "Registrar solicitud"}
                </button>
                <Link to="/servicios/carrito" className="checkout-secondary-button">
                  ← Carrito
                </Link>
              </div>
            </form>
          </div>
        </section>

        <aside>
          <div className="checkout-summary-card">
            <div className="checkout-summary-head">
              <h2>Resumen</h2>
            </div>
            <div className="checkout-totals" style={{ marginBottom: 0 }}>
              <div className="checkout-total-row">
                <span>Servicio</span>
                <strong style={{ color: "#111" }}>{service}</strong>
              </div>
              <div className="checkout-total-row">
                <span>Modo</span>
                <strong style={{ color: "#111" }}>{modeLabels[mode] || "Compra directa"}</strong>
              </div>
              {serviceSlug && (
                <div className="checkout-total-row">
                  <span>Referencia</span>
                  <strong style={{ color: "#111" }}>{serviceSlug}</strong>
                </div>
              )}
            </div>
            <div className="checkout-secure-box">
              <LockIcon />
              <div>
                <strong>Secure Checkout - SSL Encrypted</strong>
                <p>Tus datos personales están protegidos durante toda la transacción.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── StoreCardPaymentForm ──────────────────────────────────────────────── */
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
            name: checkoutForm.name || undefined,
            email: checkoutForm.email || undefined,
            phone: checkoutForm.phone || undefined,
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
      {/* Button rendered by right column via form="checkout-stripe-form" */}
    </form>
  );
}

/* ─── StoreCheckout ─────────────────────────────────────────────────────── */
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
  initialCouponCode = "",
}) {
  const canCreateOrder = !createdOrder?.id;
  const [bookingSelections, setBookingSelections] = useState({});
  const [bookingSummary, setBookingSummary] = useState([]);
  const [bookingStatus, setBookingStatus] = useState(INITIAL_BOOKING_STATUS);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [couponCode, setCouponCode] = useState(initialCouponCode);
  const [couponState, setCouponState] = useState({ status: "idle", message: "" });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [crmFormState, setCrmFormState] = useState({
    status: storeCheckoutFormSectionKey ? "loading" : "error",
    message: "",
    formConfig: null,
  });
  const [crmFormValues, setCrmFormValues] = useState({});
  const [crmFormErrors, setCrmFormErrors] = useState({});

  const crmFields = useMemo(() => {
    const fields = Array.isArray(crmFormState.formConfig?.fields_schema)
      ? crmFormState.formConfig.fields_schema
      : [];
    return fields.filter((field) => field?.visible !== false);
  }, [crmFormState.formConfig]);

  const fallbackCanSubmit =
    String(checkoutForm.name || "").trim() && String(checkoutForm.email || "").trim();

  function handleBookingSelectionChange(slug, selection) {
    setBookingSelections((prev) => ({ ...prev, [slug]: selection }));
  }

  // A service requires calendar if its panel returned a non-null selection at least once,
  // meaning the panel is visible. Block submit only if it's visible but incomplete (null).
  // This stays the authoritative guard inside handleSubmit — the stepper below uses its
  // own bookingStatus.scheduleComplete signal to gate navigation, but this check is what
  // actually stops an order from being created.
  const bookingBlocked = Object.values(bookingSelections).some((v) => v === null);

  const steps = useMemo(
    () => buildSteps(bookingStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookingStatus.requiresCalendar, bookingStatus.hasCustomization]
  );

  const detailsValid = useMemo(() => {
    if (crmFormState.status === "ready" && crmFields.length) {
      const errors = validateFormFields(crmFields, crmFormValues);
      if (Object.keys(errors).length > 0) return false;
      const parsed = parseCheckoutDataFromForm(crmFields, crmFormValues);
      return Boolean(parsed.name && parsed.email);
    }
    if (crmFormState.status === "error") {
      return Boolean(fallbackCanSubmit);
    }
    return false;
  }, [crmFormState.status, crmFields, crmFormValues, fallbackCanSubmit]);

  // Read-only customer data for the review step. The CRM form keeps its
  // live values in crmFormValues while the user is on step 3 — checkoutForm
  // is only synced from it inside prepareStoreCheckoutPayload(), right
  // before the order is created. Reading checkoutForm directly in the
  // review step showed blank name/email/phone until that point.
  const reviewCustomer = useMemo(() => {
    if (crmFormState.status === "ready" && crmFields.length) {
      const parsed = parseCheckoutDataFromForm(crmFields, crmFormValues);
      return { name: parsed.name, email: parsed.email, phone: parsed.phone };
    }
    return {
      name: checkoutForm.name || "",
      email: checkoutForm.email || "",
      phone: checkoutForm.phone || "",
    };
  }, [crmFormState.status, crmFields, crmFormValues, checkoutForm.name, checkoutForm.email, checkoutForm.phone]);

  const stepCtx = {
    scheduleComplete: bookingStatus.scheduleComplete,
    customizationComplete: bookingStatus.customizationComplete,
    detailsValid,
  };

  // DEV-only: confirms bookingStatus follows loading -> ready and never
  // regresses back to loading unless the cart itself actually changed —
  // a regression would indicate the panel got remounted.
  const prevDiscoveryRef = useRef({ status: bookingStatus.status, items: cart.items });
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const prev = prevDiscoveryRef.current;
    if (prev.status === "ready" && bookingStatus.status === "loading" && prev.items === cart.items) {
      console.warn(
        "[booking-checkout] bookingStatus volvio de ready a loading sin que cambiara cart.items — revisar si ServiceBookingCheckoutPanel se remonto."
      );
    }
    prevDiscoveryRef.current = { status: bookingStatus.status, items: cart.items };
  }, [bookingStatus.status, cart.items]);

  const activeStepKey = steps[activeStepIndex] ?? steps[steps.length - 1] ?? "details";

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    setActiveStepIndex(index);
  }

  function handleStepContinue() {
    if (activeStepKey === "details") {
      if (crmFormState.status === "ready" && crmFields.length) {
        const errors = validateFormFields(crmFields, crmFormValues);
        if (Object.keys(errors).length > 0) {
          setCrmFormErrors(errors);
          const firstInvalidField = crmFields.find((field) => errors[field.name]);
          if (firstInvalidField) {
            requestAnimationFrame(() => {
              document
                .querySelector(`#checkout-details-form [name="${firstInvalidField.name}"]`)
                ?.focus();
            });
          }
          return;
        }
        setCrmFormErrors({});
      } else if (crmFormState.status === "error") {
        if (!fallbackCanSubmit) {
          setSubmitState({ status: "error", message: "Completa nombre y email para continuar." });
          return;
        }
      } else {
        return; // formulario todavia cargando
      }
    } else if (!isStepComplete(activeStepKey, stepCtx)) {
      return;
    }
    goToStep(activeStepIndex + 1);
  }

  function handleStepBack() {
    goToStep(activeStepIndex - 1);
  }

  useEffect(() => {
    if (!initialCouponCode || !cart?.summary?.subtotal || appliedCoupon) return;
    const code = initialCouponCode.trim();
    if (!code) return;
    setCouponState({ status: "loading", message: "" });
    validateStoreCoupon({ code, orderAmount: Number(cart.summary.subtotal), currency: cart.summary.currency || "USD" })
      .then((result) => {
        setAppliedCoupon({ code, discountAmount: result.discount_amount });
        setCouponState({ status: "success", message: `Cupón aplicado: -${formatPrice(result.discount_amount, cart.summary.currency || "USD")}` });
      })
      .catch((error) => {
        const detail = error?.message || "Cupón inválido.";
        const msgMap = {
          coupon_not_found: "El código de cupón no existe.",
          coupon_inactive: "Este cupón no está activo.",
          coupon_expired: "Este cupón expiró.",
          coupon_usage_limit_reached: "Este cupón alcanzó su límite de usos.",
          coupon_min_order_not_met: "El monto mínimo para este cupón no se ha alcanzado.",
        };
        setCouponState({ status: "error", message: msgMap[detail] || detail });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.summary?.subtotal]);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutForm() {
      if (!storeCheckoutFormSectionKey) {
        setCrmFormState({ status: "error", message: "No hay section key para el formulario de checkout.", formConfig: null });
        return;
      }
      setCrmFormState({ status: "loading", message: "", formConfig: null });

      try {
        const formConfig = await getFormByPlacement(storeCheckoutFormSectionKey);
        if (cancelled) return;
        setCrmFormState({ status: "ready", message: "", formConfig });

        const defaults = {};
        const fields = Array.isArray(formConfig?.fields_schema) ? formConfig.fields_schema : [];
        fields.forEach((field) => {
          if (!field?.name) return;
          if (field.default_value !== undefined && field.default_value !== null) {
            defaults[field.name] = field.default_value;
          }
        });

        setCrmFormValues((current) => ({
          ...defaults,
          ...current,
          email: current.email || cart?.email || "",
          service_interest: current.service_interest || cart?.items?.[0]?.snapshotName || "",
        }));
      } catch (error) {
        if (cancelled) return;
        setCrmFormState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar el formulario de checkout.",
          formConfig: null,
        });
      }
    }

    loadCheckoutForm();
    return () => { cancelled = true; };
  }, [cart?.email, cart?.items]);

  function handleFallbackChange(event) {
    const { name, value } = event.target;
    setCheckoutForm((current) => ({ ...current, [name]: value }));
  }

  function handleCrmFieldChange(name, value) {
    setCrmFormValues((current) => ({ ...current, [name]: value }));
    if (crmFormErrors[name]) {
      setCrmFormErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponState({ status: "loading", message: "" });
    try {
      const subtotal = Number(cart?.summary?.subtotal || 0);
      const result = await validateStoreCoupon({ code, orderAmount: subtotal, currency: cart?.summary?.currency || "USD" });
      setAppliedCoupon({ code, discountAmount: result.discount_amount, coupon: result.coupon });
      setCouponState({ status: "success", message: `Cupón aplicado: -${formatPrice(result.discount_amount, cart?.summary?.currency || "USD")}` });
    } catch (error) {
      setAppliedCoupon(null);
      const detail = error?.message || "Cupón inválido.";
      const msgMap = {
        coupon_not_found: "El código de cupón no existe.",
        coupon_inactive: "Este cupón no está activo.",
        coupon_expired: "Este cupón expiró.",
        coupon_usage_limit_reached: "Este cupón alcanzó su límite de usos.",
        coupon_min_order_not_met: "El monto mínimo para este cupón no se ha alcanzado.",
      };
      setCouponState({ status: "error", message: msgMap[detail] || detail });
    }
  }

  async function ensurePaymentIntent(order) {
    if (!order?.id) throw new Error("No se pudo preparar el pago porque no existe la orden.");
    const intent = await createPublicStorePaymentIntent({ orderId: order.id });
    if (!intent?.clientSecret) throw new Error("No se pudo obtener el client_secret de Stripe.");
    setPaymentIntent(intent);
    return intent;
  }

  async function ensureOrderPayable(orderId, knownOrder = null) {
    const latest = await getPublicOrderById(orderId);
    if (!latest?.id) throw new Error("No se pudo validar la orden antes del pago.");
    const paymentStatus = String(latest.paymentStatus || "").toLowerCase();
    const orderStatus = String(latest.status || "").toLowerCase();
    if (paymentStatus === "paid" || orderStatus === "paid") throw new Error("Esta orden ya fue pagada.");
    if (["cancelled", "canceled", "refunded"].includes(orderStatus) ||
        ["cancelled", "canceled", "refunded"].includes(paymentStatus)) {
      throw new Error("Esta orden no está disponible para pago.");
    }
    // See mergeTrustedOrderTotals — GET /orders/{id} doesn't carry
    // amount_due_now/balance_due/deposit_total, so a refresh through it
    // must not downgrade an already-known deposit-aware total.
    const trustedSource = knownOrder?.id === latest.id ? knownOrder : createdOrder;
    return mergeTrustedOrderTotals(latest, trustedSource);
  }

  async function handlePaymentSucceeded() {
    if (!createdOrder?.id) return;
    let latest = createdOrder;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const order = await getPublicOrderById(createdOrder.id);
        // Same GET /orders/{id} gap as ensureOrderPayable — preserve the
        // authoritative totals across each poll instead of losing them to
        // this endpoint's incomplete shape.
        if (order) latest = mergeTrustedOrderTotals(order, createdOrder);
        if (order?.paymentStatus === "paid") break;
      } catch { /* best-effort */ }
      await wait(900);
    }
    setCompletedOrder(latest);
    clearStoredCartSessionToken();
    setSubmitState({
      status: "success",
      message: latest?.paymentStatus === "paid"
        ? "Pago confirmado y orden actualizada."
        : "Pago confirmado en Stripe. La confirmación final puede tardar unos segundos.",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (bookingBlocked) {
      setSubmitState({ status: "error", message: "Selecciona fecha y horario para todos los servicios antes de continuar." });
      return;
    }
    try {
      setCrmFormErrors({});
      setSubmitState({
        status: "loading",
        message: canCreateOrder ? "Creando orden y preparando pago..." : "Preparando intento de pago...",
      });

      if (!canCreateOrder && createdOrder?.id) {
        const latestOrder = await ensureOrderPayable(createdOrder.id, createdOrder);
        setCreatedOrder(latestOrder);
        await ensurePaymentIntent(latestOrder);
        setSubmitState({ status: "success", message: "Intento de pago listo. Completa los datos de tu tarjeta." });
        return;
      }

      const checkoutPayload = await prepareStoreCheckoutPayload();
      const result = await submitPublicStoreCheckout(checkoutPayload);
      if (!result?.order?.id) throw new Error("No se pudo crear la orden de checkout.");
      setBookingSummary(result.bookingSummary || []);

      const latestOrder = await ensureOrderPayable(result.order.id, result.order);
      setCreatedOrder(latestOrder);
      await ensurePaymentIntent(latestOrder);
      setSubmitState({ status: "success", message: "Orden creada. Completa el pago con tarjeta." });
    } catch (error) {
      // error.message is the backend's raw `detail` code (storeFetch/pub
      // both surface data.detail as the Error message) — never swallowed
      // in dev, always logged, mapped to a friendly message for display.
      const rawDetail = error instanceof Error ? error.message : null;
      if (import.meta.env.DEV) {
        console.error("[checkout] submit failed:", rawDetail, error);
      }
      setSubmitState({
        status: "error",
        message: mapBookingErrorMessage(rawDetail, "No se pudo completar el checkout."),
      });
    }
  }

  async function prepareStoreCheckoutPayload() {
    if (crmFormState.status === "ready" && crmFields.length) {
      const validationErrors = validateFormFields(crmFields, crmFormValues);
      if (Object.keys(validationErrors).length) {
        setCrmFormErrors(validationErrors);
        throw new Error("Completa los campos requeridos del formulario.");
      }

      const checkoutPayload = parseCheckoutDataFromForm(crmFields, crmFormValues);
      if (!checkoutPayload.name || !checkoutPayload.email) {
        throw new Error("El formulario de checkout debe incluir nombre completo y email.");
      }

      const submissionPayload = buildFormSubmissionPayload(crmFormState.formConfig, crmFields, crmFormValues, cart);
      const submissionResult = await submitForm(submissionPayload);
      const source = crmFormState.formConfig?.source || "website_store_checkout";

      setCheckoutForm((current) => ({
        ...current,
        name: checkoutPayload.name,
        email: checkoutPayload.email,
        phone: checkoutPayload.phone,
        company: checkoutPayload.company,
        notes: checkoutPayload.notes,
      }));

      return {
        sessionToken: cart.sessionToken,
        name: checkoutPayload.name,
        email: checkoutPayload.email,
        phone: checkoutPayload.phone,
        company: checkoutPayload.company,
        notes: checkoutPayload.notes,
        contactId: submissionResult?.contact_id || null,
        documentType: "invoice",
        source,
        couponCode: appliedCoupon?.code || null,
        // Recomputed and re-validated entirely server-side — see
        // buildBookingSelectionField.
        booking_selection: buildBookingSelectionField(bookingSelections),
      };
    }

    if (!fallbackCanSubmit) throw new Error("Completa nombre y email para continuar.");

    return {
      sessionToken: cart.sessionToken,
      name: checkoutForm.name,
      email: checkoutForm.email,
      phone: checkoutForm.phone || null,
      company: checkoutForm.company || null,
      notes: checkoutForm.notes || null,
      documentType: "invoice",
      source: "website_store_checkout",
      couponCode: appliedCoupon?.code || null,
      booking_selection: buildBookingSelectionField(bookingSelections),
    };
  }

  /* ── Completed order view ───────────────────────────────────────────── */
  if (completedOrder) {
    return (
      <div className="checkout-modern-page">
        <div className="checkout-hero">
          <h1>Pedido confirmado</h1>
        </div>

        <div className="checkout-modern-shell">
          <section>
            <div className="checkout-card">
              <div className="checkout-success-badge" style={{ marginBottom: 20 }}>
                Pago confirmado
              </div>
              <h2>Tu contratación está confirmada</h2>
              <p>Tu pago fue procesado y la orden quedó registrada para seguimiento.</p>

              <div className="checkout-totals" style={{ marginTop: 24 }}>
                <div className="checkout-total-row">
                  <span>Número de orden</span>
                  <strong style={{ color: "#111" }}>{completedOrder.orderNumber}</strong>
                </div>
                <div className="checkout-total-row">
                  <span>Email</span>
                  <strong style={{ color: "#111" }}>{completedOrder.email}</strong>
                </div>
                <div className="checkout-total-row">
                  <span>Estado de pago</span>
                  <strong style={{ color: "#111" }}>{completedOrder.paymentStatus}</strong>
                </div>
                <div className="checkout-total-row is-total">
                  <span>Total</span>
                  <strong>{formatPrice(completedOrder.total, completedOrder.currency)}</strong>
                </div>
              </div>

              {submitState.status !== "idle" && (
                <p className={`form-status form-status--${submitState.status}`} style={{ marginTop: 16 }}>
                  {submitState.message}
                </p>
              )}
            </div>
          </section>

          <aside>
            <div className="checkout-summary-card">
              <div style={{ display: "grid", gap: 12 }}>
                <Button to={`/servicios/ordenes/${completedOrder.orderNumber}`} block>
                  Ver confirmación
                </Button>
                <Button to="/servicios" block>
                  Volver a servicios
                </Button>
              </div>
              <div className="checkout-secure-box" style={{ marginTop: 24 }}>
                <LockIcon />
                <div>
                  <strong>Secure Checkout - SSL Encrypted</strong>
                  <p>Tus datos personales y financieros están protegidos durante toda la transacción.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ── Main checkout view ─────────────────────────────────────────────── */
  const isProcessing = submitState.status === "loading";
  const paymentReady = Boolean(paymentIntent?.clientSecret);

  // Discovery still running — don't show the (possibly wrong) 2-step or
  // 4-step stepper until every cart item has resolved its booking config.
  const isDiscovering = bookingStatus.status !== "ready";
  const resolutionErrors = bookingStatus.resolutionErrors || [];
  const hasResolutionError = resolutionErrors.length > 0;

  const panelSection =
    isDiscovering || hasResolutionError
      ? "hidden"
      : activeStepKey === "schedule"
      ? "schedule"
      : activeStepKey === "customize"
      ? "customize"
      : "hidden";

  const bookingServices = bookingStatus.services.filter(
    (svc) => svc.hasCalendar || svc.hasPackages || svc.hasAddons
  );

  const bookingExtrasEstimate = bookingServices.reduce((sum, svc) => {
    const addonsTotal = (svc.display?.addons || []).reduce(
      (addonSum, addon) => addonSum + Number(addon.price || 0) * Number(addon.quantity || 0),
      0
    );
    return sum + addonsTotal;
  }, 0);

  const depositEstimate = bookingServices.reduce((sum, svc) => {
    const selection = bookingSelections[svc.slug];
    return sum + Number(selection?.deposit_amount || 0);
  }, 0);

  const isReviewStep = activeStepKey === "review";
  const showWizardState = isDiscovering || hasResolutionError;

  return (
    <div className="checkout-modern-page">
      <div className="checkout-hero">
        <h1>Finaliza tu contratación</h1>
      </div>

      {/* Single unified surface: stepper + step content + footer all live in
          one card, and it is ALWAYS mounted (only hidden via CSS while on
          the review step) — never conditionally removed from the tree based
          on isDiscovering/hasResolutionError/activeStepKey. That's what
          keeps ServiceBookingCheckoutPanel's internal reducer (selected
          date/slot/package/addon quantities) alive across the whole
          checkout, not just across step navigation — the exact bug the
          original "single instance" fix (Bloqueo 1) closed. Going back to
          conditionally unmounting this card would reopen it. */}
      <div className="checkout-wizard-card" style={isReviewStep ? { display: "none" } : undefined}>
        {!showWizardState && (
          <div className="checkout-wizard-card__stepper">
            <BookingStepper
              steps={steps}
              activeIndex={activeStepIndex}
              ctx={stepCtx}
              onStepClick={goToStep}
              showConfirmationPill={!bookingStatus.hasBooking}
              confirmed={false}
            />
          </div>
        )}

        <div className="checkout-wizard-card__body">
          {isDiscovering && (
            <div className="checkout-wizard-state">
              <h2>Preparando tu checkout...</h2>
              <p>Estamos revisando los servicios de tu resumen.</p>
            </div>
          )}

          {!isDiscovering && hasResolutionError && (
            <div className="checkout-wizard-state">
              <h2>No pudimos preparar tu checkout</h2>
              <p>No pudimos preparar uno de los servicios. Regresa al carrito e inténtalo nuevamente.</p>
              <Button to="/servicios/carrito">Volver al carrito</Button>
            </div>
          )}

          {!showWizardState && activeStepKey === "schedule" && (
            <div className="checkout-step-header">
              <h2>Fecha y hora</h2>
              <p className="checkout-step-header__hint">
                {bookingServices.length > 1
                  ? `Elige fecha y horario para ${bookingServices.map((s) => s.name).join(" y ")}.`
                  : "Elige el día y horario para tu servicio."}
              </p>
            </div>
          )}

          {!showWizardState && activeStepKey === "customize" && (
            <div className="checkout-step-header">
              <h2>Personaliza</h2>
              <p className="checkout-step-header__hint">Ajusta paquete y extras para tu servicio.</p>
            </div>
          )}

          {/* ALWAYS mounted, same call site regardless of isDiscovering/
              hasResolutionError/activeStepKey — see the comment on
              .checkout-wizard-card above. Renders nothing visible unless
              section is "schedule" or "customize" (see panelSection). */}
          <ServiceBookingCheckoutPanel
            cart={cart}
            section={panelSection}
            onSelectionChange={handleBookingSelectionChange}
            onStatusChange={setBookingStatus}
          />

          {!showWizardState && activeStepKey === "details" && (
            <>
              <div className="checkout-step-header">
                <h2>Tus datos</h2>
                <p className="checkout-step-header__hint">Completa tu información de contacto.</p>
              </div>

              <div id="checkout-details-form">
                {/* Loading CRM form */}
                {crmFormState.status === "loading" && (
                  <div className="checkout-crm-form__loading">
                    <div className="checkout-crm-form__spinner" />
                    <p>Cargando formulario...</p>
                  </div>
                )}

                {/* CRM fields via DynamicField */}
                {crmFormState.status === "ready" && crmFields.length ? (
                  <div className="checkout-form-grid">
                    {crmFields.map((field) => (
                      <DynamicField
                        key={field.id || field.name}
                        field={field}
                        value={crmFormValues[field.name] ?? field.default_value ?? ""}
                        onChange={handleCrmFieldChange}
                        error={crmFormErrors[field.name]}
                        disabled={!canCreateOrder}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Fallback fields */}
                {crmFormState.status === "error" ? (
                  <>
                    {crmFormState.message && (
                      <p className="form-status form-status--error" style={{ marginBottom: 16 }}>
                        {crmFormState.message}
                      </p>
                    )}
                    <div className="checkout-form-grid">
                      <div className="checkout-field">
                        <label>Nombre completo <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="text" name="name" value={checkoutForm.name} onChange={handleFallbackChange} placeholder="Tu nombre completo" required disabled={!canCreateOrder} />
                      </div>
                      <div className="checkout-field">
                        <label>Email <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="email" name="email" value={checkoutForm.email} onChange={handleFallbackChange} placeholder="tu@email.com" required disabled={!canCreateOrder} />
                      </div>
                      <div className="checkout-field">
                        <label>Teléfono</label>
                        <input type="text" name="phone" value={checkoutForm.phone} onChange={handleFallbackChange} placeholder="+52 55 0000 0000" disabled={!canCreateOrder} />
                      </div>
                      <div className="checkout-field">
                        <label>Empresa</label>
                        <input type="text" name="company" value={checkoutForm.company} onChange={handleFallbackChange} placeholder="Nombre de tu empresa" disabled={!canCreateOrder} />
                      </div>
                      <div className="checkout-field is-full">
                        <label>Notas</label>
                        <textarea name="notes" value={checkoutForm.notes} onChange={handleFallbackChange} placeholder="Notas sobre entrega, acceso o cualquier detalle adicional." disabled={!canCreateOrder} />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        {!showWizardState && activeStepKey !== "review" && (
          <div className="checkout-wizard-card__footer">
            {activeStepKey === "schedule" && (
              <>
                <span />
                <Button onClick={handleStepContinue} disabled={!isStepComplete("schedule", stepCtx)}>
                  Continuar
                </Button>
              </>
            )}
            {activeStepKey === "customize" && (
              <>
                {steps.includes("schedule") ? (
                  <button type="button" className="checkout-secondary-button" onClick={handleStepBack}>
                    Volver
                  </button>
                ) : <span />}
                <Button onClick={handleStepContinue}>Continuar</Button>
              </>
            )}
            {activeStepKey === "details" && (
              <>
                {(steps.includes("schedule") || steps.includes("customize")) ? (
                  <button type="button" className="checkout-secondary-button" onClick={handleStepBack}>
                    Volver
                  </button>
                ) : <span />}
                <Button onClick={handleStepContinue}>Continuar</Button>
              </>
            )}
          </div>
        )}
      </div>

      {!showWizardState && activeStepKey === "review" && (
        <div className="checkout-wizard-shell">
          <div className="checkout-review">
            {/* ── Editable summary blocks ──────────────────────────────── */}
            <section className="checkout-review__main">
              <h2>Revisar y pagar</h2>

              <div className="checkout-review__section">
                <h3>Servicio{cart.items.length > 1 ? "s" : ""}</h3>
                <div className="checkout-summary-items">
                  {cart.items.map((item) => {
                    const thumb =
                      item.coverImageUrl ||
                      item.image_url ||
                      item.product?.cover_image_url ||
                      item.metadata?.cover_image_url ||
                      null;

                    return (
                      <div className="checkout-summary-item" key={item.id || item.productId}>
                        <div className="checkout-summary-thumb">
                          {thumb ? (
                            <img src={thumb} alt={item.snapshotName} />
                          ) : (
                            <span>{(item.snapshotName || "S").slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="checkout-summary-name">{item.snapshotName}</div>
                          <div className="checkout-summary-meta">
                            {item.quantity}x &middot; {formatPrice(item.unitPrice, item.currency)}
                          </div>
                        </div>
                        <strong className="checkout-summary-line-total">
                          {formatPrice(item.unitPrice * item.quantity, item.currency)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {bookingStatus.hasBooking && (
                <div className="checkout-review__section">
                  <h3>Reserva</h3>
                  {bookingServices.map((svc) => {
                    const selection = bookingSelections[svc.slug];
                    return (
                      <div key={svc.slug} className="checkout-review__booking">
                        <strong>{svc.name}</strong>
                        <ul>
                          {svc.hasCalendar && selection?.starts_at && (
                            <li>Fecha: {formatDateTime(selection.starts_at)}</li>
                          )}
                          {svc.display?.packageName && <li>Paquete: {svc.display.packageName}</li>}
                          {svc.display?.addons?.length > 0 && (
                            <li>
                              Extras:{" "}
                              {svc.display.addons
                                .map((addon) => `${addon.name} x${addon.quantity}`)
                                .join(", ")}
                            </li>
                          )}
                          {selection?.estimated_duration_minutes ? (
                            <li>Duración estimada: {selection.estimated_duration_minutes} min</li>
                          ) : null}
                          {selection?.deposit_amount > 0 && (
                            <li>
                              Depósito: {formatPrice(selection.deposit_amount, cart.summary.currency)}
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="checkout-review__section">
                <h3>Cliente</h3>
                <ul>
                  {reviewCustomer.name && <li>{reviewCustomer.name}</li>}
                  {reviewCustomer.email && <li>{reviewCustomer.email}</li>}
                  {reviewCustomer.phone && <li>{reviewCustomer.phone}</li>}
                </ul>
              </div>

              {!createdOrder && (
                <div className="checkout-review__edit-links">
                  {steps.includes("schedule") && (
                    <button type="button" onClick={() => goToStep(steps.indexOf("schedule"))}>
                      Editar fecha y hora
                    </button>
                  )}
                  {steps.includes("customize") && (
                    <button type="button" onClick={() => goToStep(steps.indexOf("customize"))}>
                      Editar personalización
                    </button>
                  )}
                  <button type="button" onClick={() => goToStep(steps.indexOf("details"))}>
                    Editar datos
                  </button>
                </div>
              )}

              {/* Stripe payment box — appears after payment intent is ready */}
              {paymentReady && (
                <div style={{ marginTop: 28 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px", color: "#111" }}>
                    Método de pago
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 16px" }}>
                    Ingresa los datos de tu tarjeta para completar la contratación.
                  </p>
                  {stripePromise ? (
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
                  )}
                </div>
              )}

              {submitState.status !== "idle" && !paymentReady && (
                <p className={`form-status form-status--${submitState.status}`} style={{ marginTop: 16 }}>
                  {submitState.message}
                </p>
              )}

              {/* Submitted via the pay button's form="checkout-order-form" attribute */}
              <form id="checkout-order-form" onSubmit={handleSubmit} />
            </section>

            {/* ── Totals + pay ─────────────────────────────────────────── */}
            <aside className="checkout-review__aside">
              <div className="checkout-summary-card">
                <div className="checkout-summary-head">
                  <h2>Total</h2>
                  <Link to="/servicios/carrito" className="checkout-edit-link">
                    Editar carrito
                  </Link>
                </div>

                <div className="checkout-coupon-row">
                  <input
                    type="text"
                    placeholder="Código de descuento"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (appliedCoupon) setAppliedCoupon(null);
                      if (couponState.status !== "idle") setCouponState({ status: "idle", message: "" });
                    }}
                    disabled={couponState.status === "loading" || !canCreateOrder}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponState.status === "loading" || !couponCode.trim() || !canCreateOrder}
                  >
                    {couponState.status === "loading" ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponState.status !== "idle" && (
                  <p className={`form-status form-status--${couponState.status === "success" ? "success" : "error"}`} style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>
                    {couponState.message}
                  </p>
                )}

                {createdOrder ? (
                  // Authoritative totals — the order was created server-side
                  // from the cart, so these are the numbers Stripe will
                  // actually charge, not a frontend estimate. contractTotal
                  // is the full service/order value; amountDueNow is what
                  // gets charged right now (can be a deposit, in which case
                  // balanceDue is what remains owed after this payment).
                  <div className="checkout-totals">
                    {createdOrder.discountTotal > 0 && (
                      <div className="checkout-total-row" style={{ color: "#16a34a" }}>
                        <span>Descuento</span>
                        <span>-{formatPrice(createdOrder.discountTotal, createdOrder.currency)}</span>
                      </div>
                    )}
                    <div className="checkout-total-row">
                      <span>Total del servicio</span>
                      <span>{formatPrice(createdOrder.contractTotal, createdOrder.currency)}</span>
                    </div>
                    <div className="checkout-total-row is-total">
                      <span>A pagar ahora</span>
                      <span>{formatPrice(createdOrder.amountDueNow, createdOrder.currency)}</span>
                    </div>
                    {createdOrder.depositTotal > 0 && (
                      <div className="checkout-total-row">
                        <span>Depósito</span>
                        <span>{formatPrice(createdOrder.depositTotal, createdOrder.currency)}</span>
                      </div>
                    )}
                    {createdOrder.balanceDue > 0 && (
                      <div className="checkout-total-row">
                        <span>Balance pendiente</span>
                        <span>{formatPrice(createdOrder.balanceDue, createdOrder.currency)}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {createdOrder && bookingSummary.length > 0 && (
                  // Read-only receipt of what the server actually reserved
                  // — never assume a hold exists (reservation_hold_id/
                  // startsAt/endsAt are null for a "configured" no-calendar
                  // entry, which is a valid, non-error state).
                  <div className="checkout-totals" style={{ marginTop: 14 }}>
                    {bookingSummary.map((entry, idx) => (
                      <div key={entry.reservationHoldId || `${entry.serviceSlug}-${idx}`} style={{ marginBottom: idx < bookingSummary.length - 1 ? 12 : 0 }}>
                        <div className="checkout-total-row">
                          <span style={{ fontWeight: 600 }}>{entry.serviceSlug}</span>
                          <span>{formatPrice(entry.serviceTotal, createdOrder.currency)}</span>
                        </div>
                        {entry.startsAt && (
                          <div className="checkout-total-row">
                            <span>Fecha y hora</span>
                            <span>{formatDateTime(entry.startsAt)}</span>
                          </div>
                        )}
                        {entry.packageName && (
                          <div className="checkout-total-row">
                            <span>Paquete</span>
                            <span>{entry.packageName}</span>
                          </div>
                        )}
                        {entry.addons.map((addon) => (
                          <div className="checkout-total-row" key={addon.addonId}>
                            <span>{addon.name} x{addon.quantity}</span>
                            <span>{formatPrice(addon.price * addon.quantity, createdOrder.currency)}</span>
                          </div>
                        ))}
                        {entry.depositAmount > 0 && (
                          <div className="checkout-total-row">
                            <span>Depósito</span>
                            <span>{formatPrice(entry.depositAmount, createdOrder.currency)}</span>
                          </div>
                        )}
                        <div className="checkout-total-row">
                          <span>Estado</span>
                          <span>{entry.status === "configured" ? "Configurado" : entry.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!createdOrder && (
                  <div className="checkout-totals">
                    <div className="checkout-total-row">
                      <span>
                        Subtotal ({cart.items.length}{" "}
                        {cart.items.length === 1 ? "item" : "items"})
                      </span>
                      <span>{formatPrice(cart.summary.subtotal, cart.summary.currency)}</span>
                    </div>
                    {bookingExtrasEstimate > 0 && (
                      <div className="checkout-total-row">
                        <span>Extras (estimado)</span>
                        <span>{formatPrice(bookingExtrasEstimate, cart.summary.currency)}</span>
                      </div>
                    )}
                    {depositEstimate > 0 && (
                      <div className="checkout-total-row">
                        <span>Depósito requerido (estimado)</span>
                        <span>{formatPrice(depositEstimate, cart.summary.currency)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="checkout-total-row" style={{ color: "#16a34a" }}>
                        <span>Descuento ({appliedCoupon.code})</span>
                        <span>-{formatPrice(appliedCoupon.discountAmount, cart.summary.currency)}</span>
                      </div>
                    )}
                    <div className="checkout-total-row is-total">
                      <span>Total estimado</span>
                      <span>
                        {formatPrice(
                          Math.max(0, Number(cart.summary.subtotal) - Number(appliedCoupon?.discountAmount || 0)),
                          cart.summary.currency
                        )}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "0.76rem", color: "#71717a" }}>
                      El monto final se confirma al crear tu orden.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  form={paymentReady ? "checkout-stripe-form" : "checkout-order-form"}
                  className="checkout-pay-button"
                  style={{ width: "100%", marginTop: 16 }}
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "Procesando..."
                    : paymentReady
                    ? "Pagar ahora"
                    : "Crear orden y continuar al pago"}
                </button>

                {createdOrder && !paymentReady && (
                  <p style={{ marginTop: 10, fontSize: "0.82rem", color: "#6b7280", textAlign: "center" }}>
                    Orden <strong>{createdOrder.orderNumber}</strong> creada. Preparando pago...
                  </p>
                )}

                <div className="checkout-secure-box">
                  <LockIcon />
                  <div>
                    <strong>Secure Checkout - SSL Encrypted</strong>
                    <p>Tus datos personales y financieros están protegidos durante toda la transacción.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CheckoutPage (root) ───────────────────────────────────────────────── */
export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get("service") || "Servicio pendiente";
  const serviceSlug = searchParams.get("serviceSlug") || "";
  const clientType = searchParams.get("clientType") || "";
  const pageOrigin = searchParams.get("pageOrigin") || "";
  const originCta = searchParams.get("cta") || "";
  const mode = searchParams.get("mode") || "buy";
  const querySessionToken = searchParams.get("sessionToken") || "";
  const activeSessionToken = querySessionToken || getStoredCartSessionToken() || "";
  const couponCodeFromUrl = searchParams.get("couponCode") || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    method: mode === "booking" ? "deposit" : "card",
    message: "",
  });
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
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
    if (!isStoreCheckout) return undefined;
    let cancelled = false;

    async function loadCart() {
      setCreatedOrder(null);
      setPaymentIntent(null);
      setCompletedOrder(null);
      setCartState({ status: "loading", message: "" });

      try {
        const result = await getPublicCart(activeSessionToken);
        if (!cancelled) {
          setCart(result);
          setCheckoutForm((current) => ({ ...current, email: current.email || result?.email || "" }));
          setCartState({ status: "idle", message: "" });
          if (import.meta.env.DEV) {
            console.log("[checkout] cart items raw:\n" + JSON.stringify(
              (result?.items || []).map((it) => ({
                id: it.id,
                productId: it.productId,
                productSlug: it.productSlug,
                "product.slug": it.product?.slug ?? "(null)",
                snapshotName: it.snapshotName,
                metadata: it.metadata,
              })),
              null, 2
            ));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCart(null);
          setCartState({
            status: "error",
            message: error instanceof Error ? error.message : "No se pudo cargar el resumen para checkout.",
          });
        }
      }
    }

    loadCart();
    return () => { cancelled = true; };
  }, [activeSessionToken, isStoreCheckout]);

  if (isStoreCheckout) {
    if (cartState.status === "loading") {
      return (
        <div className="checkout-modern-page">
          <CheckoutHero activeStep={2} />
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 24px" }}>
            <div className="empty-state">
              <h2>Preparando tu checkout...</h2>
              <p>Estamos cargando tu resumen de contratación.</p>
            </div>
          </div>
        </div>
      );
    }

    if (!cart || !cart.items.length) {
      return (
        <div className="checkout-modern-page">
          <CheckoutHero activeStep={2} />
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
            <div className="empty-state">
              <h2>Tu resumen no está listo para checkout</h2>
              <p>{cartState.message || "Agrega servicios desde el catálogo antes de continuar."}</p>
              <div className="empty-state__actions">
                <Button to="/servicios">Ir a servicios</Button>
                <Button to="/servicios/carrito" variant="secondary">Revisar resumen</Button>
              </div>
            </div>
          </div>
        </div>
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
        initialCouponCode={couponCodeFromUrl}
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
