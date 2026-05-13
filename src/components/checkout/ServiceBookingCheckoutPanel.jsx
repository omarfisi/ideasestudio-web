import { useEffect, useReducer, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getPublicServiceBooking,
  getPublicServiceAvailability,
} from "@/lib/publicServicesApi.js";
import { formatPrice } from "@/lib/formatPrice.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  return d;
}

function buildCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Monday=0
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

function durationLabel(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ─── per-service reducer ──────────────────────────────────────────────────────

const SVC_INIT = {
  loadState: "idle",   // idle | loading | ready | error
  booking: null,
  calMonth: null,
  availState: "idle",  // idle | loading | ready | error
  slots: [],
  selectedDate: null,
  selectedSlot: null,
  addonQty: {},
  selectedPackage: null,
};

function svcReducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loadState: "loading" };
    case "LOAD_OK": {
      const now = new Date();
      return {
        ...state,
        loadState: "ready",
        booking: action.data,
        calMonth: new Date(now.getFullYear(), now.getMonth(), 1),
        addonQty: Object.fromEntries(
          (action.data.addons || []).map((a) => [a.id, a.min_quantity ?? 0])
        ),
        selectedPackage:
          action.data.packages?.find((p) => p.is_default)?.id ??
          action.data.packages?.[0]?.id ??
          null,
      };
    }
    case "LOAD_ERR":
      return { ...state, loadState: "error" };
    case "PREV_MONTH":
      return { ...state, calMonth: addMonths(state.calMonth, -1), selectedDate: null, selectedSlot: null, slots: [] };
    case "NEXT_MONTH":
      return { ...state, calMonth: addMonths(state.calMonth, 1), selectedDate: null, selectedSlot: null, slots: [] };
    case "AVAIL_START":
      return { ...state, availState: "loading", slots: [] };
    case "AVAIL_OK":
      return { ...state, availState: "ready", slots: action.slots };
    case "AVAIL_ERR":
      return { ...state, availState: "error", slots: [] };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date, selectedSlot: null };
    case "SELECT_SLOT":
      return { ...state, selectedSlot: action.slot };
    case "SET_ADDON":
      return { ...state, addonQty: { ...state.addonQty, [action.id]: action.qty } };
    case "SET_PACKAGE":
      return { ...state, selectedPackage: action.id, selectedSlot: null };
    default:
      return state;
  }
}

// ─── single-service booking section ──────────────────────────────────────────

function ServiceBookingSection({ slug, serviceName, onSelectionChange }) {
  const [s, dispatch] = useReducer(svcReducer, SVC_INIT);

  // Load booking config
  useEffect(() => {
    if (!slug) return;
    dispatch({ type: "LOAD_START" });
    getPublicServiceBooking(slug)
      .then((data) => dispatch({ type: "LOAD_OK", data }))
      .catch(() => dispatch({ type: "LOAD_ERR" }));
  }, [slug]);

  // Load availability when month changes
  useEffect(() => {
    if (s.loadState !== "ready") return;
    const settings = s.booking?.booking_settings;
    if (!settings?.requires_calendar) return;
    if (!s.calMonth) return;

    const from = toYMD(s.calMonth);
    const lastDay = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 0);
    const to = toYMD(lastDay);

    dispatch({ type: "AVAIL_START" });
    getPublicServiceAvailability(slug, from, to)
      .then((res) => dispatch({ type: "AVAIL_OK", slots: res.slots || [] }))
      .catch(() => dispatch({ type: "AVAIL_ERR" }));
  }, [slug, s.loadState, s.calMonth]);

  // Notify parent of selection changes
  useEffect(() => {
    if (s.loadState !== "ready") return;
    const settings = s.booking?.booking_settings;
    const addons = s.booking?.addons || [];

    const hasCalendar = settings?.requires_calendar;
    if (hasCalendar && (!s.selectedDate || !s.selectedSlot)) {
      onSelectionChange(slug, null);
      return;
    }

    const basePkg = (s.booking?.packages || []).find((p) => p.id === s.selectedPackage);
    const basePrice = basePkg ? basePkg.price : (s.booking?.service?.base_price ?? 0);
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * (s.addonQty[a.id] ?? 0), 0);
    const addonDuration = addons.reduce((sum, a) => {
      if (!a.affects_duration) return sum;
      return sum + a.duration_minutes * (s.addonQty[a.id] ?? 0);
    }, 0);
    const baseDuration = (basePkg?.duration_minutes ?? null) ?? settings?.base_duration_minutes ?? 60;
    const totalDuration = baseDuration + addonDuration;
    const total = basePrice + addonsTotal;

    const depositAmount = (() => {
      if (!settings?.requires_deposit) return 0;
      if (settings.deposit_type === "percent") return Math.round(total * settings.deposit_amount / 100 * 100) / 100;
      return settings.deposit_amount ?? 0;
    })();

    onSelectionChange(slug, {
      service_slug: slug,
      starts_at: s.selectedSlot?.starts_at ?? null,
      ends_at: s.selectedSlot?.ends_at ?? null,
      package_id: s.selectedPackage ?? null,
      selected_addons: Object.entries(s.addonQty)
        .filter(([, qty]) => qty > 0)
        .map(([addon_id, quantity]) => ({ addon_id, quantity })),
      estimated_total: total,
      estimated_duration_minutes: totalDuration,
      deposit_amount: depositAmount,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, s.selectedSlot, s.addonQty, s.selectedPackage]);

  const handleAddon = useCallback((id, delta, min, max) => {
    const current = s.addonQty[id] ?? 0;
    const next = Math.max(min ?? 0, Math.min(max ?? 99, current + delta));
    dispatch({ type: "SET_ADDON", id, qty: next });
  }, [s.addonQty]);

  // Loading / error states
  if (s.loadState === "idle" || s.loadState === "loading") {
    return (
      <div className="cbp-section">
        <div className="cbp-section__head">
          <span className="cbp-section__title">{serviceName}</span>
        </div>
        <div className="cbp-loading">Cargando disponibilidad...</div>
      </div>
    );
  }
  if (s.loadState === "error") return null;

  const { booking } = s;
  const settings = booking.booking_settings;
  const addons = booking.addons || [];
  const packages = booking.packages || [];
  const hasCalendar = settings.requires_calendar;
  const hasPkgs = packages.length > 1;
  const hasAddons = addons.length > 0;

  if (!hasCalendar && !hasAddons && !hasPkgs) return null;

  const slotDates = new Set(s.slots.map((sl) => sl.date));
  const daySlots = s.selectedDate ? s.slots.filter((sl) => sl.date === s.selectedDate) : [];
  const monthLabel = s.calMonth?.toLocaleString("es", { month: "long", year: "numeric" });
  const year = s.calMonth?.getFullYear();
  const month = s.calMonth?.getMonth();
  const calCells = hasCalendar ? buildCalendarGrid(year, month) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const basePkg = hasPkgs ? packages.find((p) => p.id === s.selectedPackage) : null;
  const basePrice = basePkg ? basePkg.price : (booking.service?.base_price ?? 0);
  const currency = basePkg ? basePkg.currency : (booking.service?.currency ?? "USD");
  const addonsTotal = addons.reduce((sum, a) => sum + a.price * (s.addonQty[a.id] ?? 0), 0);
  const addonDuration = addons.reduce((sum, a) => {
    if (!a.affects_duration) return sum;
    return sum + a.duration_minutes * (s.addonQty[a.id] ?? 0);
  }, 0);
  const baseDuration = (basePkg?.duration_minutes ?? null) ?? settings.base_duration_minutes ?? 60;
  const totalDuration = baseDuration + addonDuration;
  const total = basePrice + addonsTotal;
  const depositAmount = (() => {
    if (!settings.requires_deposit) return 0;
    if (settings.deposit_type === "percent") return Math.round(total * settings.deposit_amount / 100 * 100) / 100;
    return settings.deposit_amount ?? 0;
  })();

  return (
    <div className="cbp-section">
      <div className="cbp-section__head">
        <span className="cbp-section__title">{serviceName}</span>
        {hasCalendar && s.selectedSlot && (
          <span className="cbp-section__selected">
            {new Date(s.selectedSlot.starts_at).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} · {s.selectedSlot.label}
          </span>
        )}
      </div>

      {/* Package chips */}
      {hasPkgs && (
        <div className="cbp-block">
          <span className="cbp-block__label">PAQUETE</span>
          <div className="cbp-chips">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                className={`cbp-chip${s.selectedPackage === pkg.id ? " active" : ""}`}
                onClick={() => dispatch({ type: "SET_PACKAGE", id: pkg.id })}
              >
                {pkg.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      {hasCalendar && (
        <div className="cbp-block">
          <span className="cbp-block__label">FECHA Y HORA</span>
          <div className="cbp-cal-nav">
            <button type="button" className="cbp-cal-nav__btn" onClick={() => dispatch({ type: "PREV_MONTH" })} aria-label="Mes anterior">
              <ChevronLeft size={14} />
            </button>
            <span className="cbp-cal-nav__month">
              {monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : ""}
            </span>
            <button type="button" className="cbp-cal-nav__btn" onClick={() => dispatch({ type: "NEXT_MONTH" })} aria-label="Mes siguiente">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="cbp-cal-grid">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
              <div key={d} className="cbp-cal-dow">{d}</div>
            ))}
            {calCells.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} />;
              const ymd = toYMD(cell);
              const isPast = cell < today;
              const isAvail = slotDates.has(ymd);
              const isSel = s.selectedDate === ymd;
              let cls = "cbp-cal-day";
              if (isPast) cls += " past";
              else if (isAvail) cls += " available";
              if (isSel) cls += " selected";
              return (
                <button
                  key={ymd}
                  type="button"
                  className={cls}
                  disabled={isPast || !isAvail}
                  onClick={() => dispatch({ type: "SELECT_DATE", date: ymd })}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          {/* Slots expand inside calendar block */}
          {s.selectedDate && (
            <div className="cbp-slots-section">
              <span className="cbp-slots-section__label">HORARIO DISPONIBLE</span>
              {daySlots.length === 0 ? (
                <p className="cbp-notice">Sin horarios para esta fecha.</p>
              ) : (
                <div className="cbp-slots">
                  {daySlots.map((sl) => (
                    <button
                      key={sl.starts_at}
                      type="button"
                      className={`cbp-slot${s.selectedSlot?.starts_at === sl.starts_at ? " active" : ""}`}
                      onClick={() => dispatch({ type: "SELECT_SLOT", slot: sl })}
                    >
                      {sl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Addons */}
      {hasAddons && (
        <div className="cbp-block">
          <span className="cbp-block__label">EXTRAS OPCIONALES</span>
          {addons.map((a) => {
            const qty = s.addonQty[a.id] ?? 0;
            return (
              <div key={a.id} className="cbp-addon">
                <div className="cbp-addon__info">
                  <span className="cbp-addon__name">{a.name}</span>
                  {a.price > 0 && (
                    <span className="cbp-addon__price">+{formatPrice(a.price, a.currency)}</span>
                  )}
                </div>
                <div className="cbp-qty">
                  <button
                    type="button"
                    className="cbp-qty__btn"
                    onClick={() => handleAddon(a.id, -1, a.min_quantity, a.max_quantity)}
                    disabled={qty <= (a.min_quantity ?? 0)}
                  >−</button>
                  <span className="cbp-qty__val">{qty}</span>
                  <button
                    type="button"
                    className="cbp-qty__btn"
                    onClick={() => handleAddon(a.id, 1, a.min_quantity, a.max_quantity)}
                    disabled={qty >= (a.max_quantity ?? 99)}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mini summary */}
      <div className="cbp-mini-summary">
        <div className="cbp-mini-summary__row">
          <span>Servicio base</span>
          <span>{formatPrice(basePrice, currency)}</span>
        </div>
        {addonsTotal > 0 && (
          <div className="cbp-mini-summary__row">
            <span>Extras</span>
            <span>+{formatPrice(addonsTotal, currency)}</span>
          </div>
        )}
        {depositAmount > 0 && (
          <div className="cbp-mini-summary__row cbp-mini-summary__row--deposit">
            <span>Depósito requerido</span>
            <span>{formatPrice(depositAmount, currency)}</span>
          </div>
        )}
        <div className="cbp-mini-summary__total">
          <span>Total estimado</span>
          <span>{formatPrice(total, currency)}</span>
        </div>
        <div className="cbp-mini-summary__dur">
          Duración estimada: {durationLabel(totalDuration)}
        </div>
      </div>

      {/* Validation message */}
      {hasCalendar && !s.selectedSlot && (
        <p className="cbp-required-hint">
          Selecciona una fecha y horario para continuar con el pago.
        </p>
      )}
    </div>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export default function ServiceBookingCheckoutPanel({ cart, onSelectionChange, onRequiredChange }) {
  // Find cart items that have a service slug
  const bookableItems = (cart?.items || [])
    .map((item) => ({
      slug: item.product?.slug || null,
      name: item.snapshotName || item.product?.name || "Servicio",
    }))
    .filter((it) => Boolean(it.slug));

  if (bookableItems.length === 0) return null;

  return (
    <div className="cbp-panel">
      <h3 className="cbp-panel__heading">Fecha y detalles del servicio</h3>
      <p className="cbp-panel__sub">Selecciona la fecha, horario y extras antes de pagar.</p>
      {bookableItems.map((item) => (
        <ServiceBookingSection
          key={item.slug}
          slug={item.slug}
          serviceName={item.name}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  );
}
