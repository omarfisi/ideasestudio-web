import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { getFormByPlacement, submitForm } from "@/lib/publicFormsApi.js";
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
const storeCheckoutFormSectionKey = (
  import.meta.env.VITE_STORE_CHECKOUT_FORM_SECTION_KEY || "contact_main_form"
).trim();

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    if (
      ["phone", "telefono", "tel", "customer_phone", "whatsapp"].includes(target)
    ) {
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
    payload.notes = payload.notes
      ? `${payload.notes}\n\n${detailText}`
      : detailText;
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

function CheckoutProgress({ step = 1 }) {
  return (
    <ol className="cart-checkout-steps checkout-steps" aria-label="Progreso de compra">
      <li className={step === 1 ? "is-active" : ""}>
        <span>1</span>
        <strong>Carrito</strong>
      </li>
      <li className={step === 2 ? "is-active" : ""}>
        <span>2</span>
        <strong>Datos de checkout</strong>
      </li>
      <li className={step === 3 ? "is-active" : ""}>
        <span>3</span>
        <strong>Orden completada</strong>
      </li>
    </ol>
  );
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

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutForm() {
      if (!storeCheckoutFormSectionKey) {
        setCrmFormState({
          status: "error",
          message: "No hay section key para el formulario de checkout.",
          formConfig: null,
        });
        return;
      }

      setCrmFormState({
        status: "loading",
        message: "",
        formConfig: null,
      });

      try {
        const formConfig = await getFormByPlacement(storeCheckoutFormSectionKey);
        if (cancelled) return;

        setCrmFormState({
          status: "ready",
          message: "",
          formConfig,
        });

        const defaults = {};
        const fields = Array.isArray(formConfig?.fields_schema)
          ? formConfig.fields_schema
          : [];

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
          service_interest:
            current.service_interest ||
            cart?.items?.[0]?.snapshotName ||
            "",
        }));
      } catch (error) {
        if (cancelled) return;
        setCrmFormState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el formulario de checkout.",
          formConfig: null,
        });
      }
    }

    loadCheckoutForm();

    return () => {
      cancelled = true;
    };
  }, [cart?.email, cart?.items]);

  function handleFallbackChange(event) {
    const { name, value } = event.target;
    setCheckoutForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCrmFieldChange(name, value) {
    setCrmFormValues((current) => ({
      ...current,
      [name]: value,
    }));
    if (crmFormErrors[name]) {
      setCrmFormErrors((current) => ({
        ...current,
        [name]: "",
      }));
    }
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
      setCrmFormErrors({});
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

      const checkoutPayload = await prepareStoreCheckoutPayload();
      const result = await submitPublicStoreCheckout(checkoutPayload);

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

  async function prepareStoreCheckoutPayload() {
    if (crmFormState.status === "ready" && crmFields.length) {
      const validationErrors = validateFormFields(crmFields, crmFormValues);
      if (Object.keys(validationErrors).length) {
        setCrmFormErrors(validationErrors);
        throw new Error("Completa los campos requeridos del formulario.");
      }

      const checkoutPayload = parseCheckoutDataFromForm(crmFields, crmFormValues);
      if (!checkoutPayload.name || !checkoutPayload.email) {
        throw new Error(
          "El formulario de checkout debe incluir nombre completo y email."
        );
      }

      const submissionPayload = buildFormSubmissionPayload(
        crmFormState.formConfig,
        crmFields,
        crmFormValues,
        cart
      );

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
        source,
      };
    }

    if (!fallbackCanSubmit) {
      throw new Error("Completa nombre y email para continuar.");
    }

    return {
      sessionToken: cart.sessionToken,
      name: checkoutForm.name,
      email: checkoutForm.email,
      phone: checkoutForm.phone || null,
      company: checkoutForm.company || null,
      notes: checkoutForm.notes || null,
      source: "website_store_checkout",
    };
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
              <CheckoutProgress step={3} />
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
            <CheckoutProgress step={2} />
            <h2>Datos para tu orden</h2>
            <p className="detail-summary__note">
              El formulario de esta etapa se administra desde el CRM.
            </p>

            {crmFormState.status === "loading" ? (
              <div className="checkout-crm-form__loading">
                <div className="checkout-crm-form__spinner" />
                <p>Cargando formulario desde CRM...</p>
              </div>
            ) : null}

            {crmFormState.status === "ready" && crmFields.length ? (
              <div className="form-grid checkout-crm-form-grid">
                {crmFields.map((field) => {
                  const value = crmFormValues[field.name] ?? "";
                  const error = crmFormErrors[field.name];
                  const className = `field ${
                    field.width === "half" ? "" : "field--full"
                  }`;

                  if (field.type === "hidden") {
                    return (
                      <input
                        key={field.id || field.name}
                        type="hidden"
                        value={value}
                        name={field.name}
                      />
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <label key={field.id || field.name} className={className}>
                        <span>{field.label}</span>
                        <select
                          name={field.name}
                          value={value}
                          onChange={(event) =>
                            handleCrmFieldChange(field.name, event.target.value)
                          }
                          required={Boolean(field.required)}
                          disabled={!canCreateOrder}
                        >
                          <option value="">
                            {field.placeholder || "Selecciona una opción"}
                          </option>
                          {(field.options || []).map((option) => (
                            <option
                              key={`${field.name}-${option.value}`}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {error ? <small className="field__error">{error}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <label key={field.id || field.name} className={className}>
                        <span>{field.label}</span>
                        <textarea
                          rows="5"
                          name={field.name}
                          value={value}
                          onChange={(event) =>
                            handleCrmFieldChange(field.name, event.target.value)
                          }
                          placeholder={field.placeholder || ""}
                          required={Boolean(field.required)}
                          disabled={!canCreateOrder}
                        />
                        {error ? <small className="field__error">{error}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "checkbox") {
                    return (
                      <label key={field.id || field.name} className={className}>
                        <span>{field.label}</span>
                        <input
                          type="checkbox"
                          name={field.name}
                          checked={Boolean(value)}
                          onChange={(event) =>
                            handleCrmFieldChange(field.name, event.target.checked)
                          }
                          required={Boolean(field.required)}
                          disabled={!canCreateOrder}
                        />
                        {error ? <small className="field__error">{error}</small> : null}
                      </label>
                    );
                  }

                  return (
                    <label key={field.id || field.name} className={className}>
                      <span>{field.label}</span>
                      <input
                        type={field.type || "text"}
                        name={field.name}
                        value={value}
                        onChange={(event) =>
                          handleCrmFieldChange(field.name, event.target.value)
                        }
                        placeholder={field.placeholder || ""}
                        required={Boolean(field.required)}
                        disabled={!canCreateOrder}
                      />
                      {error ? <small className="field__error">{error}</small> : null}
                    </label>
                  );
                })}
              </div>
            ) : null}

            {crmFormState.status === "error" ? (
              <>
                <p className="form-status form-status--error">
                  {crmFormState.message ||
                    "No se pudo cargar el formulario desde CRM. Usa el formulario de respaldo."}
                </p>
                <div className="form-grid">
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      name="name"
                      value={checkoutForm.name}
                      onChange={handleFallbackChange}
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
                      onChange={handleFallbackChange}
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
                      onChange={handleFallbackChange}
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
                      onChange={handleFallbackChange}
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
                      onChange={handleFallbackChange}
                      placeholder="Notas sobre entrega, acceso o cualquier detalle adicional."
                      disabled={!canCreateOrder}
                    />
                  </label>
                </div>
              </>
            ) : null}

            {submitState.status !== "idle" ? (
              <p className={`form-status form-status--${submitState.status}`}>
                {submitState.message}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={
                submitState.status === "loading" ||
                (!canCreateOrder && Boolean(paymentIntent?.clientSecret))
              }
            >
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

          <aside className="detail-summary cart-checkout-summary">
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
