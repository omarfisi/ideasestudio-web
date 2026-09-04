import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import ServiceBookingPanel from "@/components/booking/ServiceBookingPanel.jsx";
import {
  createOrUpdatePublicCart,
  createPublicStorePaymentIntent,
  getPublicCatalog,
  getPublicProductBySlug,
  getPublicServiceBySlug,
  getPublicOrderById,
  submitPublicStoreCheckout,
} from "@/lib/api.js";
import { getPublicServiceBooking } from "@/lib/publicServicesApi.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { stripePromise } from "@/lib/stripeClient.js";
import StoreCardPaymentForm from "@/components/checkout/StoreCardPaymentForm.jsx";
import "./PublicBookingPage.css";

function isBookable(booking) {
  return booking?.booking_settings?.requires_calendar === true;
}

function serviceLabel(service) {
  return service?.name || "Servicio";
}

function BookingPreviewCard({ children }) {
  if (children) {
    return (
      <aside className="public-booking__preview public-booking__preview--live" aria-label="Calendario de reserva">
        <div className="public-booking__preview-topline">
          <span>Disponibilidad real</span>
          <span className="public-booking__preview-status">En vivo</span>
        </div>
        {children}
      </aside>
    );
  }

  return (
    <aside className="public-booking__preview" aria-label="Vista previa de agenda">
      <div className="public-booking__preview-topline">
        <span>Reserva rápida</span>
        <span className="public-booking__preview-status">Agenda</span>
      </div>
      <div className="public-booking__preview-date">
        <div>
          <span className="public-booking__preview-month">AGENDA</span>
          <strong>—</strong>
        </div>
        <div>
          <span className="public-booking__preview-weekday">Selecciona un servicio</span>
          <span className="public-booking__preview-caption">Para consultar fechas y horarios disponibles</span>
        </div>
      </div>
      <div className="public-booking__mini-calendar" aria-hidden="true">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <span key={`day-${index}`}>{day}</span>)}
        {Array.from({ length: 7 }, (_, index) => <span key={`placeholder-${index}`}>·</span>)}
      </div>
      <p className="public-booking__preview-empty">La disponibilidad aparecerá al elegir un servicio.</p>
    </aside>
  );
}

function PublicBookingHeader({ children, bookingPreview }) {
  return (
    <header className="public-booking__hero">
      <div className="public-booking__hero-inner">
        <div className="public-booking__hero-copy">
          <div className="public-booking__eyebrow">Ideas Estudio</div>
          {children}
          <div className="public-booking__hero-chips" aria-label="Beneficios de la reserva">
            <span>Reserva pública</span>
            <span>Disponibilidad en tiempo real</span>
            <span>Sin llamadas ni esperas</span>
          </div>
        </div>
        <BookingPreviewCard>{bookingPreview}</BookingPreviewCard>
      </div>
    </header>
  );
}

function BookingState({ title, message, children }) {
  return (
    <section className="public-booking__state" role="status">
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </section>
  );
}

function formatBookingDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatBookingTime(value, timezone) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    hour: "numeric", minute: "2-digit", timeZone: timezone || "America/Puerto_Rico",
  }).format(new Date(value));
}

function PaymentPanel({ order, paymentIntent, customer, submitState, setSubmitState, onPaymentSucceeded }) {
  if (!stripePromise) {
    return <p className="public-booking__form-error" role="alert">No se pudo inicializar el pago seguro.</p>;
  }

  const amountDueNow = order?.amountDueNow ?? order?.amount_due_now ?? order?.total;
  const currency = order?.currency || "USD";

  return (
    <section className="public-booking__payment" aria-labelledby="public-booking-payment-heading">
      <div className="public-booking__eyebrow">Pago seguro</div>
      <h2 id="public-booking-payment-heading">Completa tu pago</h2>
      <Elements key={paymentIntent.providerPaymentId || paymentIntent.clientSecret} stripe={stripePromise}>
        <StoreCardPaymentForm
          clientSecret={paymentIntent.clientSecret}
          order={order}
          billingDetails={customer}
          submitState={submitState}
          setSubmitState={setSubmitState}
          onPaymentSucceeded={onPaymentSucceeded}
        />
      </Elements>
      <button
        type="submit"
        form="checkout-stripe-form"
        className="public-booking__button public-booking__payment-submit"
        disabled={submitState.status === "loading"}
      >
        {submitState.status === "loading" ? "Procesando pago…" : `Pagar ${formatPrice(amountDueNow, currency)}`}
      </button>
    </section>
  );
}

function BookingSelectionSection({ selection, display }) {
  return (
    <section className="public-booking__checkout-section" aria-labelledby="booking-selection-heading">
      <div className="public-booking__section-heading">
        <div>
          <div className="public-booking__eyebrow">Tu selección</div>
          <h2 id="booking-selection-heading">Fecha y hora</h2>
        </div>
        <a className="public-booking__edit-link" href="#booking-schedule">Editar</a>
      </div>
      <dl className="public-booking__selection-details">
        <div><dt>Fecha</dt><dd>{formatBookingDate(selection.starts_at?.slice(0, 10))}</dd></div>
        <div><dt>Hora</dt><dd>{formatBookingTime(selection.starts_at, display?.timezone)}</dd></div>
        <div><dt>Zona horaria</dt><dd>{display?.timezone || "America/Puerto_Rico"}</dd></div>
      </dl>
    </section>
  );
}

function BookingSummary({ service, selection, display, payment }) {
  const order = payment?.order;
  const amountDueNow = order?.amountDueNow;
  const balanceDue = order?.balanceDue;
  const total = order?.contractTotal ?? order?.total ?? display?.total;
  const currency = order?.currency || display?.currency || "USD";

  return (
    <aside className="public-booking__order-summary" aria-labelledby="booking-summary-heading">
      <div className="public-booking__eyebrow">Resumen de reserva</div>
      <h2 id="booking-summary-heading">{service.name}</h2>
      <dl className="public-booking__summary-list">
        <div><dt>Fecha</dt><dd>{formatBookingDate(selection.starts_at?.slice(0, 10))}</dd></div>
        <div><dt>Hora</dt><dd>{formatBookingTime(selection.starts_at, display?.timezone)}</dd></div>
        <div><dt>Duración</dt><dd>{display?.durationMinutes ? `${display.durationMinutes} minutos` : "—"}</dd></div>
        <div><dt>Zona horaria</dt><dd>{display?.timezone || "America/Puerto_Rico"}</dd></div>
        {display?.packageName && <div><dt>Paquete</dt><dd>{display.packageName}</dd></div>}
        {display?.addons?.length > 0 && <div><dt>Extras</dt><dd>{display.addons.map((addon) => `${addon.name} ×${addon.quantity}`).join(", ")}</dd></div>}
      </dl>
      <div className="public-booking__summary-totals">
        {total != null && <div><span>{order ? "Subtotal" : "Total estimado"}</span><strong>{formatPrice(total, currency)}</strong></div>}
        {order && <div><span>Pago requerido hoy</span><strong>{formatPrice(amountDueNow, currency)}</strong></div>}
        {order && <div><span>Balance restante</span><strong>{formatPrice(balanceDue, currency)}</strong></div>}
      </div>
      {order && <div className="public-booking__summary-total"><span>TOTAL HOY</span><strong>{formatPrice(amountDueNow, currency)}</strong></div>}
    </aside>
  );
}

function CustomerBookingForm({ service, selection, display, onSubmit, submitting, error, success, payment, onReset }) {
  const [fields, setFields] = useState({ name: "", email: "", phone: "", notes: "" });
  const [validationError, setValidationError] = useState("");

  if (success) {
    return (
      <section className="public-booking__confirmation" aria-live="polite">
        <div className="public-booking__eyebrow">Solicitud recibida</div>
        <h2>Recibimos tu solicitud de reserva</h2>
        <p>El equipo revisará la disponibilidad y dará seguimiento a tu solicitud.</p>
        <dl className="public-booking__summary-list">
          <div><dt>Servicio</dt><dd>{service.name}</dd></div>
          <div><dt>Fecha</dt><dd>{formatBookingDate(selection.starts_at?.slice(0, 10))}</dd></div>
          <div><dt>Hora</dt><dd>{formatBookingTime(selection.starts_at, display?.timezone)}</dd></div>
          <div><dt>Estado</dt><dd>{success.status === "pending_confirmation" || success.status === "paid" ? "Pago recibido, pendiente de confirmación" : success.status === "confirmed" ? "Reserva confirmada" : success.status === "pending" ? "Pendiente de revisión" : success.status}</dd></div>
        </dl>
        <button type="button" className="public-booking__button" onClick={onReset}>Reservar otro horario</button>
      </section>
    );
  }

  if (payment) {
    return (
      <>
        <section className="public-booking__checkout-section" aria-labelledby="customer-booking-heading">
          <div className="public-booking__eyebrow">Pago</div>
          <h2 id="customer-booking-heading">Método de pago</h2>
          <p className="public-booking__section-note">Tu reserva está retenida temporalmente mientras completas el pago.</p>
        </section>
        <PaymentPanel {...payment} />
      </>
    );
  }

  function submit(event) {
    event.preventDefault();
    const name = fields.name.trim();
    const email = fields.email.trim();
    if (!name) return setValidationError("Escribe tu nombre.");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setValidationError("Escribe un correo electrónico válido.");
    }
    setValidationError("");
    onSubmit({
      starts_at: selection.starts_at,
      package_id: selection.package_id,
      selected_addons: selection.selected_addons,
      customer_name: name,
      customer_email: email,
      customer_phone: fields.phone.trim() || null,
      notes: fields.notes.trim() || null,
    });
  }

  return (
    <section className="public-booking__checkout-section" aria-labelledby="customer-booking-heading">
      <div className="public-booking__section-heading">
        <div>
          <div className="public-booking__eyebrow">Siguiente paso</div>
          <h2 id="customer-booking-heading">Tus datos</h2>
        </div>
      </div>
      <form className="public-booking__customer-form" onSubmit={submit} noValidate>
        <div className="public-booking__customer-fields">
          <label>Nombre *<input name="customer_name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} autoComplete="name" /></label>
          <label>Teléfono<input name="customer_phone" type="tel" value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} autoComplete="tel" /></label>
          <label>Correo electrónico *<input name="customer_email" type="email" value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} autoComplete="email" /></label>
        </div>
        <div className="public-booking__notes-section">
          <div className="public-booking__eyebrow">Opcional</div>
          <h3>Notas</h3>
          <label className="public-booking__notes-label">Información adicional<textarea name="notes" rows="4" value={fields.notes} onChange={(event) => setFields({ ...fields, notes: event.target.value })} /></label>
        </div>
        {(validationError || error) && <p className="public-booking__form-error" role="alert">{validationError || error}</p>}
        <button className="public-booking__button" type="submit" disabled={submitting}>
          {submitting ? "Preparando pago…" : "Continuar al pago"}
        </button>
      </form>
    </section>
  );
}

function BookingCatalog() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", services: [], error: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadBookableServices() {
      setState({ status: "loading", services: [], error: "" });
      try {
        const catalog = await getPublicCatalog();
        const candidates = (catalog?.items || []).filter(
          (service) => service?.isActive !== false && service?.slug
        );
        const results = await Promise.allSettled(
          candidates.map(async (service) => {
            const booking = await getPublicServiceBooking(service.slug);
            return isBookable(booking) ? service : null;
          })
        );
        const services = results
          .filter((result) => result.status === "fulfilled" && result.value)
          .map((result) => result.value);

        if (!cancelled) {
          setState({ status: "ready", services, error: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            services: [],
            error: error?.message || "No pudimos cargar los servicios reservables.",
          });
        }
      }
    }

    loadBookableServices();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SEOHead title="Agenda una cita | Ideas Estudio" />
      <PublicBookingHeader>
        <h1>Agenda una cita</h1>
        <p>Selecciona el servicio que deseas reservar.</p>
      </PublicBookingHeader>

      <section className="public-booking__content" aria-labelledby="booking-services-heading">
        <div className="public-booking__section-heading">
          <div>
            <div className="public-booking__eyebrow">Reserva pública</div>
            <h2 id="booking-services-heading">Servicios disponibles</h2>
          </div>
          <Link className="public-booking__back-link" to="/servicios">
            Ver todos los servicios
          </Link>
        </div>

        {state.status === "loading" && (
          <BookingState title="Cargando servicios" message="Estamos verificando la disponibilidad de agenda." />
        )}
        {state.status === "error" && (
          <BookingState title="No pudimos cargar las reservas" message={state.error} />
        )}
        {state.status === "ready" && state.services.length === 0 && (
          <BookingState
            title="No hay servicios reservables disponibles"
            message="Puedes escribirnos para coordinar una alternativa."
          />
        )}
        {state.status === "ready" && state.services.length > 0 && (
          <div className="public-booking__service-grid">
            {state.services.map((service) => (
              <button
                key={service.slug}
                type="button"
                className="public-booking__service-card"
                onClick={() => navigate(`/reservar/${encodeURIComponent(service.slug)}`)}
              >
                <span className="public-booking__service-card-eyebrow">Reserva con calendario</span>
                <strong>{serviceLabel(service)}</strong>
                {service.shortDescription && <span>{service.shortDescription}</span>}
                <span className="public-booking__service-card-cta">Seleccionar servicio →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function BookingBySlug() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading", service: null, booking: null, error: "" });
  const [selection, setSelection] = useState(null);
  const [display, setDisplay] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [payment, setPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resetSignal, setResetSignal] = useState(0);

  const handleSelectionChange = useCallback((_slug, nextSelection) => {
    setSelection(nextSelection);
  }, []);

  const handleStatusChange = useCallback((_slug, info) => {
    setDisplay(info.display || null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadService() {
      setState({ status: "loading", service: null, booking: null, error: "" });
      try {
        const service = await getPublicServiceBySlug(slug);
        if (!service) {
          if (!cancelled) setState({ status: "not-found", service: null, booking: null, error: "" });
          return;
        }
        const booking = await getPublicServiceBooking(slug);
        if (!cancelled) {
          setState({
            status: isBookable(booking) ? "ready" : "unavailable",
            service: isBookable(booking) ? service : null,
            booking: isBookable(booking) ? booking : null,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", service: null, booking: null, error: error?.message || "No pudimos cargar esta reserva." });
        }
      }
    }

    if (slug) loadService();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <BookingState title="Cargando reserva" message="Estamos preparando el calendario." />;
  }
  if (state.status === "not-found") {
    return (
      <BookingState title="Servicio no encontrado" message="Este servicio no está disponible en este momento.">
        <Link className="public-booking__button" to="/reservar">Volver a servicios reservables</Link>
      </BookingState>
    );
  }
  if (state.status === "unavailable") {
    return (
      <BookingState title="Reserva no disponible" message="Este servicio no tiene una agenda pública disponible.">
        <Link className="public-booking__button" to="/reservar">Ver otros servicios</Link>
      </BookingState>
    );
  }
  if (state.status === "error") {
    return <BookingState title="No pudimos cargar esta reserva" message={state.error} />;
  }

  return (
    <>
      <SEOHead title={`Reservar ${serviceLabel(state.service)} | Ideas Estudio`} />
      <PublicBookingHeader
        bookingPreview={
          <div id="booking-schedule">
            <ServiceBookingPanel
              slug={state.service.slug}
              serviceName={serviceLabel(state.service)}
              section={payment ? "hidden" : "schedule"}
              resetSignal={resetSignal}
              onSelectionChange={handleSelectionChange}
              onStatusChange={handleStatusChange}
            />
          </div>
        }
      >
        <h1>Reserva tu fecha</h1>
        <p>Selecciona tu horario para {serviceLabel(state.service)}.</p>
      </PublicBookingHeader>
      <section className="public-booking__content public-booking__detail" aria-labelledby="booking-detail-heading">
        <div className="public-booking__section-heading">
          <div>
            <div className="public-booking__eyebrow">Selecciona tu horario</div>
            <h2 id="booking-detail-heading">{serviceLabel(state.service)}</h2>
          </div>
          <Link className="public-booking__back-link" to="/reservar">Cambiar servicio</Link>
        </div>
      </section>
      {selection?.starts_at && (
        <section className="public-booking__checkout-grid">
          <div className="public-booking__checkout-main">
            {!payment && <BookingSelectionSection selection={selection} display={display} />}
            <CustomerBookingForm
              service={state.service}
              selection={selection}
              display={display}
              submitting={submitting}
              error={submitError}
              success={reservation}
              payment={payment}
              onReset={() => { setReservation(null); setPayment(null); setSubmitError(""); setSelection(null); setResetSignal((value) => value + 1); }}
              onSubmit={async (payload) => {
            setSubmitting(true);
            setSubmitError("");
            try {
              const product = await getPublicProductBySlug(slug);
              if (!product?.id) throw new Error("No se pudo resolver el servicio para el checkout.");
              await createOrUpdatePublicCart({
                items: [{ productId: product.id, quantity: 1 }],
                replaceItems: true,
              });
              const checkout = await submitPublicStoreCheckout({
                name: payload.customer_name,
                email: payload.customer_email,
                phone: payload.customer_phone,
                notes: payload.notes,
                booking_selection: {
                  service_slug: slug,
                  starts_at: payload.starts_at,
                  package_id: payload.package_id,
                  selected_addons: payload.selected_addons,
                },
              });
              if (!checkout?.order?.id) throw new Error("No se pudo crear la orden de reserva.");
              if (checkout.paymentRequired === false || checkout.order.amountDueNow <= 0) {
                throw new Error("Esta reserva no tiene un pago válido para procesar.");
              }
              const paymentIntent = await createPublicStorePaymentIntent({ orderId: checkout.order.id });
              if (!paymentIntent?.clientSecret) throw new Error("No se pudo preparar el pago seguro.");
              setPayment({
                order: checkout.order,
                paymentIntent,
                customer: {
                  name: payload.customer_name,
                  email: payload.customer_email,
                  phone: payload.customer_phone,
                },
                submitState: { status: "idle", message: "" },
                setSubmitState: (next) => setPayment((current) => current ? { ...current, submitState: next } : current),
                onPaymentSucceeded: async () => {
                  let latest = checkout.order;
                  for (let attempt = 0; attempt < 6; attempt += 1) {
                    latest = await getPublicOrderById(checkout.order.id);
                    if (latest?.paymentStatus === "paid") break;
                    await new Promise((resolve) => setTimeout(resolve, 900));
                  }
                  const bookingStatus = latest?.bookingSummary?.[0]?.status;
                  setReservation({
                    status: bookingStatus || (latest?.paymentStatus === "paid" ? "paid" : latest?.paymentStatus || "pending"),
                  });
                  setPayment(null);
                },
              });
            } catch (error) {
              if (error?.status === 409) {
                setSubmitError("Este horario ya no está disponible. Selecciona otro.");
                setSelection(null);
                setResetSignal((value) => value + 1);
              } else if ([400, 404, 422, 429, 500].includes(error?.status)) {
                setSubmitError(error.status === 422 ? "Revisa los datos y el horario seleccionado." : "No pudimos registrar la solicitud. Inténtalo nuevamente.");
              } else {
                setSubmitError("No pudimos registrar la solicitud. Inténtalo nuevamente.");
              }
            } finally {
              setSubmitting(false);
            }
              }}
            />
          </div>
          {!reservation && <BookingSummary service={state.service} selection={selection} display={display} payment={payment} />}
        </section>
      )}
    </>
  );
}

export default function PublicBookingPage() {
  usePageSeo();
  const { slug } = useParams();
  return slug ? <BookingBySlug /> : <BookingCatalog />;
}
