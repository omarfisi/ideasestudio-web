import { useEffect, useReducer, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getPublicServiceBooking,
  getPublicServiceAvailability,
  createPublicServiceReservation,
} from "@/lib/publicServicesApi.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n, currency = "USD") {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(n || 0));
}

function fmtDuration(mins) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function isoDate(d) { return d.toISOString().slice(0, 10); }

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function monthLabel(date) {
  return date.toLocaleDateString("es-PR", { month: "long", year: "numeric" });
}

function buildMonthRange(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end   = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

function buildCalendarWeeks(month, availSet, selectedDate, today) {
  const year = month.getFullYear();
  const m    = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay  = new Date(year, m + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, m, d);
    cells.push({
      date,
      label: d,
      iso: isoDate(date),
      available: availSet.has(isoDate(date)),
      past: date < today,
      selected: isoDate(date) === selectedDate,
    });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function calcTotals(booking, selectedPackage, addonQtys) {
  const base = selectedPackage
    ? Number(selectedPackage.price)
    : Number(booking?.service?.base_price || 0);

  let addonsTotal = 0;
  let extraDuration = 0;
  for (const addon of booking?.addons || []) {
    const qty = addonQtys[addon.id] || 0;
    if (qty > 0) {
      addonsTotal += addon.price * qty;
      if (addon.affects_duration) extraDuration += addon.duration_minutes * qty;
    }
  }

  const total = base + addonsTotal;
  const s = booking?.booking_settings || {};
  const depositAmount = (() => {
    if (!s.requires_deposit) return 0;
    if (s.deposit_type === "percent")
      return Math.round(total * (s.deposit_amount || 0)) / 100;
    return s.deposit_amount || 0;
  })();

  const baseDuration = selectedPackage?.duration_minutes
    || booking?.booking_settings?.base_duration_minutes
    || 60;

  return {
    base,
    addonsTotal,
    total,
    depositAmount,
    balanceDue: total - depositAmount,
    durationMinutes: baseDuration + extraDuration,
  };
}

// ─── state machine ────────────────────────────────────────────────────────────

const INIT = {
  loadStatus: "idle",   // idle | loading | ready | error
  booking: null,
  viewMonth: new Date(),
  slotsForMonth: {},
  slotsLoading: false,
  selectedDate: null,
  selectedSlot: null,
  selectedPackage: null,
  addonQtys: {},
  customer: { name: "", email: "", phone: "", notes: "" },
  submitStatus: "idle", // idle | loading | success | error
  submitError: null,
  confirmationId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_START":    return { ...state, loadStatus: "loading" };
    case "LOAD_DONE":
      return {
        ...state,
        loadStatus: "ready",
        booking: action.booking,
        selectedPackage: action.booking?.packages?.find((p) => p.is_default) || null,
      };
    case "LOAD_ERR":      return { ...state, loadStatus: "error" };
    case "PREV_MONTH":    return { ...state, viewMonth: addMonths(state.viewMonth, -1), selectedDate: null, selectedSlot: null };
    case "NEXT_MONTH":    return { ...state, viewMonth: addMonths(state.viewMonth, 1),  selectedDate: null, selectedSlot: null };
    case "SLOTS_LOADING": return { ...state, slotsLoading: true };
    case "SLOTS_DONE":
      return { ...state, slotsLoading: false, slotsForMonth: { ...state.slotsForMonth, [action.key]: action.slots } };
    case "SELECT_DATE":   return { ...state, selectedDate: action.date, selectedSlot: null };
    case "SELECT_SLOT":   return { ...state, selectedSlot: action.slot };
    case "SELECT_PKG":    return { ...state, selectedPackage: action.pkg, selectedSlot: null };
    case "SET_QTY":       return { ...state, addonQtys: { ...state.addonQtys, [action.id]: action.qty } };
    case "SET_CUSTOMER":  return { ...state, customer: { ...state.customer, ...action.patch } };
    case "SUBMITTING":    return { ...state, submitStatus: "loading", submitError: null };
    case "SUBMIT_OK":     return { ...state, submitStatus: "success", confirmationId: action.id };
    case "SUBMIT_ERR":    return { ...state, submitStatus: "error", submitError: action.error };
    default:              return state;
  }
}

// ─── Inner modal content ──────────────────────────────────────────────────────

function ModalContent({ slug, serviceName, onClose }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const slotsLoaded = useRef(new Set());

  // Load booking config once
  useEffect(() => {
    dispatch({ type: "LOAD_START" });
    getPublicServiceBooking(slug)
      .then((data) => dispatch({ type: "LOAD_DONE", booking: data }))
      .catch(() => dispatch({ type: "LOAD_ERR" }));
  }, [slug]);

  // Load availability per month
  useEffect(() => {
    if (state.loadStatus !== "ready") return;
    if (!state.booking?.booking_settings?.requires_calendar) return;

    const key = `${state.viewMonth.getFullYear()}-${state.viewMonth.getMonth()}`;
    if (slotsLoaded.current.has(key)) return;
    slotsLoaded.current.add(key);

    const { from, to } = buildMonthRange(state.viewMonth);
    dispatch({ type: "SLOTS_LOADING" });
    getPublicServiceAvailability(slug, from, to)
      .then((data) => dispatch({ type: "SLOTS_DONE", key, slots: data.slots || [] }))
      .catch(() => dispatch({ type: "SLOTS_DONE", key, slots: [] }));
  }, [slug, state.viewMonth, state.loadStatus, state.booking]);

  if (state.loadStatus === "loading" || state.loadStatus === "idle") {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
        Cargando opciones de reserva…
      </div>
    );
  }

  if (state.loadStatus === "error") {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
        No se pudieron cargar las opciones. Intenta de nuevo.
      </div>
    );
  }

  if (state.submitStatus === "success") {
    return (
      <div className="svc-success-state">
        <div className="svc-success-icon">✓</div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>¡Solicitud enviada!</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 380 }}>
          Tu solicitud de reserva fue recibida. Nos pondremos en contacto contigo
          para confirmar la disponibilidad.
        </p>
        {state.confirmationId && (
          <p style={{ fontSize: "0.76rem", color: "var(--muted-soft)" }}>
            Referencia: <code>{state.confirmationId}</code>
          </p>
        )}
        <button className="svc-submit-btn" style={{ maxWidth: 220 }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  const { booking } = state;
  const settings = booking?.booking_settings || {};
  const hasCalendar = settings.requires_calendar;
  const hasPackages = (booking?.packages || []).length > 0;
  const hasAddons   = (booking?.addons || []).length > 0;
  const currency    = booking?.service?.currency || "USD";
  const totals      = calcTotals(booking, state.selectedPackage, state.addonQtys);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthKey     = `${state.viewMonth.getFullYear()}-${state.viewMonth.getMonth()}`;
  const slotsInMonth = state.slotsForMonth[monthKey] || [];
  const availSet     = new Set(slotsInMonth.map((s) => s.date));
  const weeks        = buildCalendarWeeks(state.viewMonth, availSet, state.selectedDate, today);
  const slotsForDate = slotsInMonth.filter((s) => s.date === state.selectedDate);

  const canSubmit =
    state.customer.name.trim().length >= 2 &&
    state.customer.email.trim().includes("@") &&
    (!hasCalendar || state.selectedSlot);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    dispatch({ type: "SUBMITTING" });
    try {
      const selectedAddons = Object.entries(state.addonQtys)
        .filter(([, qty]) => qty > 0)
        .map(([addon_id, quantity]) => ({ addon_id, quantity }));

      const result = await createPublicServiceReservation(slug, {
        starts_at: state.selectedSlot?.starts_at || new Date().toISOString(),
        package_id: state.selectedPackage?.id || null,
        selected_addons: selectedAddons,
        customer_name: state.customer.name.trim(),
        customer_email: state.customer.email.trim(),
        customer_phone: state.customer.phone.trim() || null,
        notes: state.customer.notes.trim() || null,
        website_source: "service_detail_modal",
      });
      dispatch({ type: "SUBMIT_OK", id: result.reservation?.id || null });
    } catch (err) {
      dispatch({ type: "SUBMIT_ERR", error: err.message || "Error al enviar. Intenta de nuevo." });
    }
  }

  return (
    <div className="svc-modal-body">
      {/* ── LEFT COLUMN ────────────────────────────────────── */}
      <div className="svc-modal-left">

        {/* Package selector */}
        {hasPackages && (
          <>
            <p className="svc-section-label">Paquete</p>
            <div className="svc-chip-row" style={{ marginBottom: 4 }}>
              <button
                type="button"
                className={`svc-chip${!state.selectedPackage ? " is-active" : ""}`}
                onClick={() => dispatch({ type: "SELECT_PKG", pkg: null })}
              >
                Servicio base · {fmtMoney(booking.service.base_price, currency)}
              </button>
              {booking.packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  className={`svc-chip${state.selectedPackage?.id === pkg.id ? " is-active" : ""}`}
                  onClick={() => dispatch({ type: "SELECT_PKG", pkg })}
                >
                  {pkg.name} · {fmtMoney(pkg.price, currency)}
                </button>
              ))}
            </div>
            <div className="svc-section-divider" />
          </>
        )}

        {/* Calendar */}
        {hasCalendar && (
          <>
            <p className="svc-section-label">Selecciona fecha</p>
            <div className="svc-cal-nav">
              <button type="button" className="svc-cal-nav__btn"
                onClick={() => dispatch({ type: "PREV_MONTH" })}>‹</button>
              <span className="svc-cal-nav__month">{monthLabel(state.viewMonth)}</span>
              <button type="button" className="svc-cal-nav__btn"
                onClick={() => dispatch({ type: "NEXT_MONTH" })}>›</button>
            </div>

            <div className="svc-cal-grid" style={{ marginBottom: 16 }}>
              {["L","M","X","J","V","S","D"].map((d) => (
                <div key={d} className="svc-cal-dow">{d}</div>
              ))}
              {weeks.map((week, wi) =>
                week.map((cell, ci) =>
                  cell === null ? (
                    <div key={`e-${wi}-${ci}`} />
                  ) : (
                    <button
                      key={cell.iso}
                      type="button"
                      className={[
                        "svc-cal-day",
                        cell.available && !cell.past ? "available" : "",
                        cell.selected ? "selected" : "",
                        cell.past ? "past" : "",
                      ].filter(Boolean).join(" ")}
                      disabled={!cell.available || cell.past}
                      onClick={() => cell.available && !cell.past &&
                        dispatch({ type: "SELECT_DATE", date: cell.iso })}
                      title={cell.available ? `Disponible ${cell.iso}` : "No disponible"}
                    >
                      {cell.label}
                    </button>
                  )
                )
              )}
            </div>

            {state.slotsLoading && (
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 8 }}>
                Cargando horarios…
              </p>
            )}

            {/* Slot selector */}
            {state.selectedDate && slotsForDate.length > 0 && (
              <>
                <p className="svc-section-label">Horario disponible · {state.selectedDate}</p>
                <div className="svc-slot-row" style={{ marginBottom: 4 }}>
                  {slotsForDate.map((slot) => (
                    <button
                      key={slot.starts_at}
                      type="button"
                      className={`svc-slot-btn${state.selectedSlot?.starts_at === slot.starts_at ? " is-active" : ""}`}
                      onClick={() => dispatch({ type: "SELECT_SLOT", slot })}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {state.selectedDate && !state.slotsLoading && slotsForDate.length === 0 && (
              <p className="svc-notice-msg">
                No hay horarios disponibles para {state.selectedDate}. Prueba otro día.
              </p>
            )}

            <div className="svc-section-divider" />
          </>
        )}

        {/* Addons */}
        {hasAddons && (
          <>
            <p className="svc-section-label">Extras opcionales</p>
            {booking.addons.map((addon) => {
              const qty = state.addonQtys[addon.id] || 0;
              return (
                <div key={addon.id} className="svc-addon">
                  <div className="svc-addon__info">
                    <div className="svc-addon__name">{addon.name}</div>
                    {addon.description && (
                      <div className="svc-addon__desc">{addon.description}</div>
                    )}
                    <div className="svc-addon__price">
                      {fmtMoney(addon.price, addon.currency)} / {addon.unit_label || "unidad"}
                    </div>
                  </div>
                  <div className="svc-qty">
                    <button
                      type="button"
                      className="svc-qty__btn"
                      onClick={() => dispatch({
                        type: "SET_QTY",
                        id: addon.id,
                        qty: Math.max(addon.min_quantity || 0, qty - 1),
                      })}
                    >−</button>
                    <span className="svc-qty__val">{qty}</span>
                    <button
                      type="button"
                      className="svc-qty__btn"
                      onClick={() => dispatch({
                        type: "SET_QTY",
                        id: addon.id,
                        qty: Math.min(addon.max_quantity || 10, qty + 1),
                      })}
                    >+</button>
                  </div>
                </div>
              );
            })}
            <div className="svc-section-divider" />
          </>
        )}

        {/* Customer form */}
        <form id="svc-booking-form" onSubmit={handleSubmit}>
          <p className="svc-section-label">Tus datos</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div>
              <label className="svc-field-label" htmlFor="svc-name">Nombre *</label>
              <input
                id="svc-name"
                className="svc-input"
                type="text"
                required
                autoComplete="name"
                placeholder="Tu nombre completo"
                value={state.customer.name}
                onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { name: e.target.value } })}
              />
            </div>
            <div>
              <label className="svc-field-label" htmlFor="svc-email">Correo *</label>
              <input
                id="svc-email"
                className="svc-input"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={state.customer.email}
                onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { email: e.target.value } })}
              />
            </div>
          </div>

          <label className="svc-field-label" htmlFor="svc-phone">Teléfono</label>
          <input
            id="svc-phone"
            className="svc-input"
            type="tel"
            autoComplete="tel"
            placeholder="+1 (787) 000-0000"
            value={state.customer.phone}
            onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { phone: e.target.value } })}
          />

          <label className="svc-field-label" htmlFor="svc-notes">Notas</label>
          <textarea
            id="svc-notes"
            className="svc-input"
            style={{ minHeight: 80, resize: "vertical" }}
            placeholder="Cuéntanos sobre tu proyecto o preferencias…"
            value={state.customer.notes}
            onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { notes: e.target.value } })}
          />
        </form>
      </div>

      {/* ── RIGHT COLUMN ───────────────────────────────────── */}
      <div className="svc-modal-right">
        <div className="svc-summary-service">
          <div className="svc-summary-service__name">{booking.service.name}</div>
          {booking.service.short_description && (
            <div className="svc-summary-service__sub" style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {booking.service.short_description}
            </div>
          )}
        </div>

        <div className="svc-summary-block">
          <div className="svc-summary-row">
            <span>{state.selectedPackage ? state.selectedPackage.name : "Servicio base"}</span>
            <span>{fmtMoney(totals.base, currency)}</span>
          </div>

          {/* Selected extras */}
          {(booking?.addons || []).filter((a) => (state.addonQtys[a.id] || 0) > 0).map((addon) => {
            const qty = state.addonQtys[addon.id];
            return (
              <div key={addon.id} className="svc-summary-row svc-summary-row--muted">
                <span>+ {addon.name} ×{qty}</span>
                <span>{fmtMoney(addon.price * qty, currency)}</span>
              </div>
            );
          })}

          {totals.addonsTotal > 0 && (
            <div className="svc-summary-row" style={{ borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 4 }}>
              <span>Extras</span>
              <span>{fmtMoney(totals.addonsTotal, currency)}</span>
            </div>
          )}

          <div className="svc-summary-total">
            <span>Total estimado</span>
            <span>{fmtMoney(totals.total, currency)}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="svc-summary-block" style={{ padding: "10px 14px" }}>
          <div className="svc-summary-row svc-summary-row--muted" style={{ fontSize: "0.82rem" }}>
            <span>Duración estimada</span>
            <span>{fmtDuration(totals.durationMinutes)}</span>
          </div>
          {state.selectedSlot && (
            <div className="svc-summary-row svc-summary-row--muted" style={{ fontSize: "0.82rem" }}>
              <span>Fecha y hora</span>
              <span style={{ textAlign: "right" }}>
                {state.selectedDate}
                <br />
                {state.selectedSlot.label}
              </span>
            </div>
          )}
        </div>

        {/* Deposit info */}
        {settings.requires_deposit && totals.depositAmount > 0 && (
          <div className="svc-deposit-badge">
            Depósito requerido: <strong>{fmtMoney(totals.depositAmount, currency)}</strong>
            <br />
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              Balance al confirmar: {fmtMoney(totals.balanceDue, currency)}
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Validation messages */}
        {hasCalendar && !state.selectedSlot && (
          <p className="svc-notice-msg">Selecciona fecha y hora para continuar.</p>
        )}
        {(!state.customer.name.trim() || !state.customer.email.trim()) && (
          <p className="svc-notice-msg" style={{ marginTop: 4 }}>
            Completa nombre y correo para enviar.
          </p>
        )}

        {state.submitStatus === "error" && (
          <p className="svc-error-msg">{state.submitError}</p>
        )}

        <button
          type="submit"
          form="svc-booking-form"
          className="svc-submit-btn"
          disabled={!canSubmit || state.submitStatus === "loading"}
        >
          {state.submitStatus === "loading" ? "Enviando…" : "Solicitar reserva"}
        </button>

        <p style={{ fontSize: "0.72rem", color: "var(--muted-soft)", textAlign: "center", marginTop: 10 }}>
          Te contactaremos para confirmar disponibilidad antes de finalizar.
        </p>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function BookingModal({ slug, serviceName, open, onClose }) {
  const boxRef = useRef(null);

  // ESC to close
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Focus trap (basic — focus the box when opened)
  useEffect(() => {
    if (open && boxRef.current) {
      const firstFocusable = boxRef.current.querySelector(
        "button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])"
      );
      firstFocusable?.focus();
    }
  }, [open]);

  // Backdrop click — close if clicking outside the box
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div
      className={`svc-modal-backdrop${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Reservar: ${serviceName}`}
      onClick={handleBackdropClick}
    >
      <div className="svc-modal-box" ref={boxRef}>
        <div className="svc-modal-header">
          <h2 className="svc-modal-header__title">Reservar servicio</h2>
          <button
            type="button"
            className="svc-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {open && <ModalContent slug={slug} serviceName={serviceName} onClose={onClose} />}
      </div>
    </div>,
    document.body
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export default function ServiceBookingModal({ slug, serviceName = "" }) {
  const [open, setOpen] = useReducer((_, v) => v, false);

  // Pre-check: peek at booking data to decide if CTA should render
  // We do a lightweight check — if booking endpoint errors or has nothing, hide CTA
  const [showCta, setShowCta] = useReducer((_, v) => v, null); // null=checking, true/false

  useEffect(() => {
    if (!slug) return;
    getPublicServiceBooking(slug)
      .then((data) => {
        const s = data?.booking_settings || {};
        const hasContent =
          s.requires_calendar ||
          (data?.addons || []).length > 0 ||
          (data?.packages || []).length > 0;
        setShowCta(hasContent);
      })
      .catch(() => setShowCta(false));
  }, [slug]);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (showCta === null || showCta === false) return null;

  return (
    <>
      <div className="svc-booking-cta">
        <div className="svc-booking-cta__copy">
          <h3>Reserva este servicio</h3>
          <p>
            Consulta disponibilidad, añade extras y envía tu solicitud desde aquí.
            Te confirmamos en menos de 24 horas.
          </p>
        </div>
        <button
          type="button"
          className="svc-booking-cta__btn"
          onClick={handleOpen}
        >
          Reservar este servicio →
        </button>
      </div>

      <BookingModal
        slug={slug}
        serviceName={serviceName}
        open={open}
        onClose={handleClose}
      />
    </>
  );
}
