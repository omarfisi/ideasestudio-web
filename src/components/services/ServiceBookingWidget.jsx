import { useEffect, useReducer, useRef } from "react";
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

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthRange(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

function monthLabel(date) {
  return date.toLocaleDateString("es-PR", { month: "long", year: "numeric" });
}

function buildCalendarWeeks(month, availableDatesSet, selectedDate, today) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon=0
  const cells = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, m, d);
    cells.push({
      date,
      label: d,
      iso: isoDate(date),
      available: availableDatesSet.has(isoDate(date)),
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
  const depositAmount = (() => {
    const s = booking?.booking_settings;
    if (!s?.requires_deposit) return 0;
    if (s.deposit_type === "percent")
      return Math.round(total * s.deposit_amount) / 100;
    return s.deposit_amount;
  })();

  return {
    base,
    addonsTotal,
    total,
    depositAmount,
    balanceDue: total - depositAmount,
    extraDuration,
  };
}

// ─── state machine ─────────────────────────────────────────────────────────────

const INIT = {
  step: "loading", // loading | error | config | date | slot | extras | form | submitting | success
  booking: null,
  loadError: null,
  viewMonth: new Date(),
  slotsForMonth: {},   // { "YYYY-MM": slots[] }
  slotsLoading: false,
  selectedDate: null,
  selectedSlot: null,
  selectedPackage: null,
  addonQtys: {},
  customer: { name: "", email: "", phone: "", notes: "" },
  submitError: null,
  confirmationId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOADED":
      return {
        ...state,
        step: "config",
        booking: action.booking,
        selectedPackage: action.booking?.packages?.find((p) => p.is_default) || null,
      };
    case "LOAD_ERR":
      return { ...state, step: "error", loadError: action.error };
    case "SELECT_PACKAGE":
      return { ...state, selectedPackage: action.pkg, selectedSlot: null };
    case "NEXT_MONTH":
      return { ...state, viewMonth: addMonths(state.viewMonth, 1), selectedDate: null, selectedSlot: null };
    case "PREV_MONTH":
      return { ...state, viewMonth: addMonths(state.viewMonth, -1), selectedDate: null, selectedSlot: null };
    case "SLOTS_LOADING":
      return { ...state, slotsLoading: true };
    case "SLOTS_LOADED":
      return {
        ...state,
        slotsLoading: false,
        slotsForMonth: { ...state.slotsForMonth, [action.key]: action.slots },
      };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date, selectedSlot: null, step: "date" };
    case "SELECT_SLOT":
      return { ...state, selectedSlot: action.slot, step: "extras" };
    case "SET_ADDON_QTY":
      return { ...state, addonQtys: { ...state.addonQtys, [action.id]: action.qty } };
    case "SHOW_FORM":
      return { ...state, step: "form" };
    case "BACK_TO_SLOT":
      return { ...state, step: "date" };
    case "BACK_TO_EXTRAS":
      return { ...state, step: "extras" };
    case "SET_CUSTOMER":
      return { ...state, customer: { ...state.customer, ...action.patch } };
    case "SUBMITTING":
      return { ...state, step: "submitting", submitError: null };
    case "SUCCESS":
      return { ...state, step: "success", confirmationId: action.id };
    case "SUBMIT_ERR":
      return { ...state, step: "form", submitError: action.error };
    case "INIT_DATE":
      return { ...state, step: "date" };
    default:
      return state;
  }
}

// ─── CSS-in-JS tokens ─────────────────────────────────────────────────────────

const T = {
  brand: "#f1d146",
  brandSoft: "rgba(241,209,70,0.14)",
  text: "#161616",
  muted: "#625a52",
  line: "rgba(22,22,22,0.1)",
  surface: "#ffffff",
  radius: "18px",
  radiusSm: "12px",
};

const S = {
  section: {
    background: "linear-gradient(180deg,#fbf8f3 0%,#f3ecdf 100%)",
    borderRadius: "24px",
    padding: "32px",
    marginTop: "40px",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: T.text,
    marginBottom: "4px",
  },
  sub: {
    fontSize: "0.88rem",
    color: T.muted,
    marginBottom: "24px",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
  },
  chip: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: `2px solid ${active ? T.brand : T.line}`,
    background: active ? T.brand : T.surface,
    color: T.text,
    fontWeight: active ? 700 : 500,
    fontSize: "0.88rem",
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  calHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  calNav: {
    padding: "6px 12px",
    border: `1px solid ${T.line}`,
    borderRadius: "999px",
    background: T.surface,
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  calGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "20px",
  },
  calDayLabel: {
    textAlign: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: T.muted,
    padding: "4px 0",
  },
  calDay: (cell) => ({
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontSize: "0.82rem",
    fontWeight: cell?.selected ? 700 : cell?.available ? 600 : 400,
    cursor: cell?.available && !cell?.past ? "pointer" : "default",
    background: cell?.selected
      ? T.brand
      : cell?.available && !cell?.past
      ? T.brandSoft
      : "transparent",
    color: cell?.past ? "#bbb" : T.text,
    border: cell?.selected ? `2px solid ${T.brand}` : "2px solid transparent",
    opacity: cell?.past ? 0.4 : 1,
  }),
  slotBtn: (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    border: `2px solid ${active ? T.brand : T.line}`,
    background: active ? T.brand : T.surface,
    color: T.text,
    fontWeight: active ? 700 : 500,
    fontSize: "0.88rem",
    cursor: "pointer",
  }),
  addonRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderRadius: T.radiusSm,
    background: T.surface,
    border: `1px solid ${T.line}`,
    marginBottom: "8px",
  },
  qtyBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: `1px solid ${T.line}`,
    background: T.surface,
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: T.radiusSm,
    border: `1px solid ${T.line}`,
    fontSize: "0.95rem",
    outline: "none",
    marginBottom: "12px",
    fontFamily: "inherit",
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: T.muted,
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  summaryBox: {
    background: T.brandSoft,
    borderRadius: T.radiusSm,
    padding: "16px",
    marginBottom: "16px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.9rem",
    color: T.text,
    marginBottom: "4px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: T.text,
    borderTop: `1px solid ${T.line}`,
    paddingTop: "8px",
    marginTop: "8px",
  },
  btn: (variant = "primary", disabled = false) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 24px",
    borderRadius: "999px",
    border: variant === "secondary" ? `1.5px solid ${T.line}` : "none",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    background: variant === "primary" ? T.brand : T.surface,
    color: T.text,
    fontFamily: "inherit",
  }),
  stepTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: T.muted,
    marginBottom: "12px",
  },
  divider: {
    height: 1,
    background: T.line,
    margin: "20px 0",
  },
  successBox: {
    textAlign: "center",
    padding: "32px 16px",
  },
  successIcon: {
    fontSize: "3rem",
    marginBottom: "12px",
  },
};

// ─── component ────────────────────────────────────────────────────────────────

export default function ServiceBookingWidget({ slug }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const slotsLoadedRef = useRef(new Set());

  // Load booking config
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    getPublicServiceBooking(slug)
      .then((data) => {
        if (!alive) return;
        dispatch({ type: "LOADED", booking: data });
      })
      .catch((err) => {
        if (!alive) return;
        dispatch({ type: "LOAD_ERR", error: err.message });
      });
    return () => { alive = false; };
  }, [slug]);

  // Load availability when month changes
  useEffect(() => {
    if (state.step === "loading" || state.step === "error" || state.step === "success") return;
    if (!state.booking?.booking_settings?.requires_calendar) return;

    const { from, to } = buildMonthRange(state.viewMonth);
    const key = `${state.viewMonth.getFullYear()}-${state.viewMonth.getMonth()}`;
    if (slotsLoadedRef.current.has(key)) return;

    slotsLoadedRef.current.add(key);
    dispatch({ type: "SLOTS_LOADING" });
    getPublicServiceAvailability(slug, from, to)
      .then((data) => {
        dispatch({ type: "SLOTS_LOADED", key, slots: data.slots || [] });
      })
      .catch(() => {
        dispatch({ type: "SLOTS_LOADED", key, slots: [] });
      });
  }, [slug, state.viewMonth, state.step, state.booking]);

  if (state.step === "loading") {
    return (
      <div style={S.section}>
        <p style={{ color: T.muted, fontSize: "0.9rem" }}>Cargando opciones de reserva…</p>
      </div>
    );
  }

  if (state.step === "error") {
    return null; // silent — don't break the page
  }

  const { booking } = state;
  const settings = booking?.booking_settings || {};
  const hasCalendar = settings.requires_calendar;
  const hasAddons = (booking?.addons || []).length > 0;
  const hasPackages = (booking?.packages || []).length > 0;

  // Don't show widget if nothing to offer
  if (!hasCalendar && !hasAddons && !hasPackages) return null;

  if (state.step === "success") {
    return (
      <div style={S.section}>
        <div style={S.successBox}>
          <div style={S.successIcon}>✓</div>
          <h3 style={{ ...S.heading, marginBottom: "8px" }}>¡Solicitud enviada!</h3>
          <p style={S.sub}>
            Tu solicitud de reserva fue recibida. Nos pondremos en contacto contigo
            para confirmar la disponibilidad.
          </p>
          {state.confirmationId && (
            <p style={{ fontSize: "0.78rem", color: T.muted }}>
              Referencia: {state.confirmationId}
            </p>
          )}
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthKey = `${state.viewMonth.getFullYear()}-${state.viewMonth.getMonth()}`;
  const slotsInMonth = state.slotsForMonth[monthKey] || [];
  const availableDatesSet = new Set(slotsInMonth.map((s) => s.date));
  const weeks = buildCalendarWeeks(state.viewMonth, availableDatesSet, state.selectedDate, today);
  const slotsForDate = slotsInMonth.filter((s) => s.date === state.selectedDate);
  const totals = calcTotals(booking, state.selectedPackage, state.addonQtys);
  const currency = booking?.service?.currency || "USD";

  async function handleSubmit(e) {
    e.preventDefault();
    const { name, email, phone, notes } = state.customer;
    if (!name.trim() || !email.trim()) return;

    if (hasCalendar && !state.selectedSlot)
      return dispatch({ type: "SUBMIT_ERR", error: "Selecciona fecha y hora." });

    dispatch({ type: "SUBMITTING" });
    try {
      const selectedAddons = Object.entries(state.addonQtys)
        .filter(([, qty]) => qty > 0)
        .map(([addon_id, quantity]) => ({ addon_id, quantity }));

      const payload = {
        starts_at: state.selectedSlot?.starts_at || new Date().toISOString(),
        package_id: state.selectedPackage?.id || null,
        selected_addons: selectedAddons,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || null,
        notes: notes.trim() || null,
        website_source: "service_detail",
      };

      const result = await createPublicServiceReservation(slug, payload);
      dispatch({ type: "SUCCESS", id: result.reservation?.id || null });
    } catch (err) {
      dispatch({ type: "SUBMIT_ERR", error: err.message || "Error enviando solicitud." });
    }
  }

  const isSubmitting = state.step === "submitting";

  return (
    <div style={S.section}>
      <h3 style={S.heading}>Reserva este servicio</h3>
      <p style={S.sub}>
        Selecciona fecha y extras disponibles. Te confirmaremos la disponibilidad antes de
        finalizar.
      </p>

      {/* ── Package selector ── */}
      {hasPackages && (
        <>
          <p style={S.stepTitle}>Paquete</p>
          <div style={S.row}>
            <button
              type="button"
              style={S.chip(!state.selectedPackage)}
              onClick={() => dispatch({ type: "SELECT_PACKAGE", pkg: null })}
            >
              Servicio base · {fmtMoney(booking.service.base_price, currency)}
            </button>
            {booking.packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                style={S.chip(state.selectedPackage?.id === pkg.id)}
                onClick={() => dispatch({ type: "SELECT_PACKAGE", pkg })}
              >
                {pkg.name} · {fmtMoney(pkg.price, currency)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Calendar ── */}
      {hasCalendar && (
        <>
          <div style={S.divider} />
          <p style={S.stepTitle}>Fecha disponible</p>

          <div style={S.calHeader}>
            <button
              type="button"
              style={S.calNav}
              onClick={() => dispatch({ type: "PREV_MONTH" })}
            >
              ‹
            </button>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", textTransform: "capitalize" }}>
              {monthLabel(state.viewMonth)}
            </span>
            <button
              type="button"
              style={S.calNav}
              onClick={() => dispatch({ type: "NEXT_MONTH" })}
            >
              ›
            </button>
          </div>

          <div style={S.calGrid}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <div key={d} style={S.calDayLabel}>{d}</div>
            ))}
            {weeks.map((week, wi) =>
              week.map((cell, ci) =>
                cell === null ? (
                  <div key={`e-${wi}-${ci}`} />
                ) : (
                  <button
                    key={cell.iso}
                    type="button"
                    style={S.calDay(cell)}
                    disabled={!cell.available || cell.past}
                    onClick={() => {
                      if (cell.available && !cell.past) {
                        dispatch({ type: "SELECT_DATE", date: cell.iso });
                      }
                    }}
                    title={cell.available ? `Disponible ${cell.iso}` : "No disponible"}
                  >
                    {cell.label}
                  </button>
                )
              )
            )}
          </div>

          {state.slotsLoading && (
            <p style={{ fontSize: "0.82rem", color: T.muted, marginBottom: "12px" }}>
              Cargando disponibilidad…
            </p>
          )}

          {/* ── Slot selector ── */}
          {state.selectedDate && slotsForDate.length > 0 && (
            <>
              <p style={S.stepTitle}>Horario · {state.selectedDate}</p>
              <div style={S.row}>
                {slotsForDate.map((slot) => (
                  <button
                    key={slot.starts_at}
                    type="button"
                    style={S.slotBtn(state.selectedSlot?.starts_at === slot.starts_at)}
                    onClick={() => dispatch({ type: "SELECT_SLOT", slot })}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {state.selectedDate && !state.slotsLoading && slotsForDate.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: T.muted, marginBottom: "12px" }}>
              No hay horarios disponibles para {state.selectedDate}. Prueba otro día.
            </p>
          )}
        </>
      )}

      {/* ── Extras / Addons ── */}
      {hasAddons && (
        <>
          <div style={S.divider} />
          <p style={S.stepTitle}>Extras opcionales</p>
          {booking.addons.map((addon) => {
            const qty = state.addonQtys[addon.id] || 0;
            return (
              <div key={addon.id} style={S.addonRow}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{addon.name}</span>
                  {addon.description && (
                    <span style={{ display: "block", fontSize: "0.78rem", color: T.muted }}>
                      {addon.description}
                    </span>
                  )}
                  <span style={{ fontSize: "0.82rem", color: T.muted }}>
                    {fmtMoney(addon.price, addon.currency)} / {addon.unit_label || "unidad"}
                  </span>
                </div>
                <div style={S.qtyBox}>
                  <button
                    type="button"
                    style={S.qtyBtn}
                    onClick={() =>
                      dispatch({
                        type: "SET_ADDON_QTY",
                        id: addon.id,
                        qty: Math.max(addon.min_quantity || 0, qty - 1),
                      })
                    }
                  >
                    −
                  </button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                  <button
                    type="button"
                    style={S.qtyBtn}
                    onClick={() =>
                      dispatch({
                        type: "SET_ADDON_QTY",
                        id: addon.id,
                        qty: Math.min(addon.max_quantity || 10, qty + 1),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Price summary ── */}
      <div style={{ ...S.divider }} />
      <div style={S.summaryBox}>
        <div style={S.summaryRow}>
          <span>{state.selectedPackage ? state.selectedPackage.name : "Servicio base"}</span>
          <span>{fmtMoney(totals.base, currency)}</span>
        </div>
        {totals.addonsTotal > 0 && (
          <div style={S.summaryRow}>
            <span>Extras</span>
            <span>{fmtMoney(totals.addonsTotal, currency)}</span>
          </div>
        )}
        <div style={S.totalRow}>
          <span>Total estimado</span>
          <span>{fmtMoney(totals.total, currency)}</span>
        </div>
        {settings.requires_deposit && totals.depositAmount > 0 && (
          <>
            <div style={{ ...S.summaryRow, marginTop: "8px" }}>
              <span>Depósito requerido</span>
              <span>{fmtMoney(totals.depositAmount, currency)}</span>
            </div>
            <div style={S.summaryRow}>
              <span>Balance pendiente</span>
              <span>{fmtMoney(totals.balanceDue, currency)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Customer form ── */}
      <p style={S.stepTitle}>Tus datos</p>
      <form onSubmit={handleSubmit}>
        <label style={S.label}>Nombre completo *</label>
        <input
          style={S.input}
          type="text"
          required
          placeholder="Tu nombre"
          value={state.customer.name}
          onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { name: e.target.value } })}
        />

        <label style={S.label}>Correo electrónico *</label>
        <input
          style={S.input}
          type="email"
          required
          placeholder="tu@email.com"
          value={state.customer.email}
          onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { email: e.target.value } })}
        />

        <label style={S.label}>Teléfono</label>
        <input
          style={S.input}
          type="tel"
          placeholder="+1 (787) 000-0000"
          value={state.customer.phone}
          onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { phone: e.target.value } })}
        />

        <label style={S.label}>Notas adicionales</label>
        <textarea
          style={{ ...S.input, minHeight: 80, resize: "vertical" }}
          placeholder="Cuéntanos más sobre tu proyecto o preferencias…"
          value={state.customer.notes}
          onChange={(e) => dispatch({ type: "SET_CUSTOMER", patch: { notes: e.target.value } })}
        />

        {hasCalendar && !state.selectedSlot && (
          <p style={{ fontSize: "0.82rem", color: "#c07a3c", marginBottom: "12px" }}>
            Selecciona una fecha y hora disponible antes de enviar.
          </p>
        )}

        {state.submitError && (
          <p style={{ fontSize: "0.85rem", color: "#c44", marginBottom: "12px" }}>
            {state.submitError}
          </p>
        )}

        <button
          type="submit"
          style={S.btn(
            "primary",
            isSubmitting || (hasCalendar && !state.selectedSlot) || !state.customer.name || !state.customer.email
          )}
          disabled={
            isSubmitting ||
            (hasCalendar && !state.selectedSlot) ||
            !state.customer.name ||
            !state.customer.email
          }
        >
          {isSubmitting ? "Enviando…" : "Solicitar reserva"}
        </button>
      </form>
    </div>
  );
}
