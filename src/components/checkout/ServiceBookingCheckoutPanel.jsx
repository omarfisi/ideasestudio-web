import { useEffect, useReducer, useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  getPublicServiceBooking,
  getPublicServiceAvailability,
} from "@/lib/publicServicesApi.js";
import { resolveProductSlugById } from "@/lib/api.js";
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
  const startDow = (first.getDay() + 6) % 7;
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

// ─── reducer ─────────────────────────────────────────────────────────────────

const SVC_INIT = {
  loadState: "idle",
  booking: null,
  calMonth: null,
  availState: "idle",
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

// ─── single-service section ───────────────────────────────────────────────────

function ServiceBookingSection({ slug, serviceName, onSelectionChange }) {
  const [s, dispatch] = useReducer(svcReducer, SVC_INIT);

  useEffect(() => {
    if (!slug) return;
    dispatch({ type: "LOAD_START" });
    getPublicServiceBooking(slug)
      .then((data) => dispatch({ type: "LOAD_OK", data }))
      .catch(() => dispatch({ type: "LOAD_ERR" }));
  }, [slug]);

  useEffect(() => {
    if (s.loadState !== "ready") return;
    if (!s.booking?.booking_settings?.requires_calendar) return;
    if (!s.calMonth) return;

    const from = toYMD(s.calMonth);
    const lastDay = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 0);
    const to = toYMD(lastDay);

    dispatch({ type: "AVAIL_START" });
    getPublicServiceAvailability(slug, from, to)
      .then((res) => dispatch({ type: "AVAIL_OK", slots: res.slots || [] }))
      .catch(() => dispatch({ type: "AVAIL_ERR" }));
  }, [slug, s.loadState, s.calMonth]);

  useEffect(() => {
    if (s.loadState !== "ready") return;
    const settings = s.booking?.booking_settings;
    const addons = s.booking?.addons || [];

    if (settings?.requires_calendar && (!s.selectedDate || !s.selectedSlot)) {
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
      estimated_duration_minutes: baseDuration + addonDuration,
      deposit_amount: depositAmount,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, s.selectedSlot, s.addonQty, s.selectedPackage]);

  const handleAddon = useCallback((id, delta, min, max) => {
    const current = s.addonQty[id] ?? 0;
    dispatch({ type: "SET_ADDON", id, qty: Math.max(min ?? 0, Math.min(max ?? 99, current + delta)) });
  }, [s.addonQty]);

  if (s.loadState === "idle" || s.loadState === "loading") {
    return <p className="cbp-loading">Cargando disponibilidad para {serviceName}...</p>;
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
  const total = basePrice + addonsTotal;
  const depositAmount = (() => {
    if (!settings.requires_deposit) return 0;
    if (settings.deposit_type === "percent") return Math.round(total * settings.deposit_amount / 100 * 100) / 100;
    return settings.deposit_amount ?? 0;
  })();

  return (
    <>
      {/* Package chips */}
      {hasPkgs && (
        <div className="cbp-sub">
          <p className="cbp-sub__label">Paquete</p>
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
        <div className="cbp-sub">
          <p className="cbp-sub__label">Fecha y hora</p>
          <div className="cbp-cal-nav">
            <button type="button" className="cbp-cal-nav__btn" onClick={() => dispatch({ type: "PREV_MONTH" })} aria-label="Mes anterior">
              <ChevronLeft size={13} />
            </button>
            <span className="cbp-cal-nav__month">
              {monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : ""}
            </span>
            <button type="button" className="cbp-cal-nav__btn" onClick={() => dispatch({ type: "NEXT_MONTH" })} aria-label="Mes siguiente">
              <ChevronRight size={13} />
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
                <button key={ymd} type="button" className={cls} disabled={isPast || !isAvail}
                  onClick={() => dispatch({ type: "SELECT_DATE", date: ymd })}>
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          {/* Slots expand on date click */}
          {s.selectedDate && (
            <div className="cbp-slots-wrap">
              {daySlots.length === 0 ? (
                <p className="cbp-notice">Sin horarios para esta fecha.</p>
              ) : (
                <div className="cbp-slots">
                  {daySlots.map((sl) => (
                    <button key={sl.starts_at} type="button"
                      className={`cbp-slot${s.selectedSlot?.starts_at === sl.starts_at ? " active" : ""}`}
                      onClick={() => dispatch({ type: "SELECT_SLOT", slot: sl })}>
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
        <div className="cbp-sub">
          <p className="cbp-sub__label">Extras opcionales</p>
          {addons.map((a) => {
            const qty = s.addonQty[a.id] ?? 0;
            return (
              <div key={a.id} className="cbp-addon">
                <div className="cbp-addon__info">
                  <span className="cbp-addon__name">{a.name}</span>
                  {a.price > 0 && <span className="cbp-addon__price">+{formatPrice(a.price, a.currency)}</span>}
                </div>
                <div className="cbp-qty">
                  <button type="button" className="cbp-qty__btn"
                    onClick={() => handleAddon(a.id, -1, a.min_quantity, a.max_quantity)}
                    disabled={qty <= (a.min_quantity ?? 0)}>−</button>
                  <span className="cbp-qty__val">{qty}</span>
                  <button type="button" className="cbp-qty__btn"
                    onClick={() => handleAddon(a.id, 1, a.min_quantity, a.max_quantity)}
                    disabled={qty >= (a.max_quantity ?? 99)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen del servicio */}
      {(addonsTotal > 0 || depositAmount > 0 || s.selectedSlot) && (
        <div className="cbp-sub cbp-sub--summary">
          <p className="cbp-sub__label">Resumen del servicio</p>
          <div className="cbp-summary-rows">
            {s.selectedSlot && (
              <div className="cbp-summary-row">
                <span>Fecha y hora</span>
                <span>
                  {new Date(s.selectedSlot.starts_at).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} · {s.selectedSlot.label}
                </span>
              </div>
            )}
            <div className="cbp-summary-row">
              <span>Servicio base</span>
              <span>{formatPrice(basePrice, currency)}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="cbp-summary-row">
                <span>Extras</span>
                <span>+{formatPrice(addonsTotal, currency)}</span>
              </div>
            )}
            {depositAmount > 0 && (
              <div className="cbp-summary-row cbp-summary-row--deposit">
                <span>Depósito requerido</span>
                <span>{formatPrice(depositAmount, currency)}</span>
              </div>
            )}
            <div className="cbp-summary-row cbp-summary-row--total">
              <span>Total estimado</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            <div className="cbp-summary-row cbp-summary-row--dur">
              <span>Duración estimada</span>
              <span>{durationLabel(baseDuration + addonDuration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Validation hint */}
      {hasCalendar && !s.selectedSlot && (
        <p className="cbp-required-hint">
          Selecciona fecha y hora del servicio para continuar con el pago.
        </p>
      )}
    </>
  );
}

// ─── slug detection (robust — covers all backend response shapes) ────────────

function getSlugFromItem(item) {
  return (
    item?.productSlug ||
    item?.product?.slug ||
    item?.product?.raw?.slug ||
    item?.product?.serviceTag ||
    item?.product_slug ||
    item?.snapshotSlug ||
    item?.snapshot_slug ||
    item?.service_slug ||
    item?.slug ||
    null
  );
}

// ─── panel wrapper ────────────────────────────────────────────────────────────

export default function ServiceBookingCheckoutPanel({ cart, onSelectionChange }) {
  const [resolvedItems, setResolvedItems] = useState(null); // null = resolving

  useEffect(() => {
    const rawItems = cart?.items || [];
    if (rawItems.length === 0) {
      setResolvedItems([]);
      return;
    }

    let cancelled = false;
    async function resolve() {
      const results = await Promise.all(
        rawItems.map(async (item) => {
          const name = item.snapshotName || item.product?.name || "Servicio";

          // 1. Try direct slug fields
          const directSlug = getSlugFromItem(item);
          if (directSlug) return { slug: directSlug, name };

          // 2. Check metadata fields (backend may store slug in snapshot metadata)
          const meta = item.metadata || {};
          const metaSlug =
            meta.slug ||
            meta.service_slug ||
            meta.product_slug ||
            meta.serviceSlug ||
            null;
          if (metaSlug) return { slug: metaSlug, name };

          // 3. Resolve by productId via store API
          if (item.productId) {
            const resolved = await resolveProductSlugById(item.productId);
            if (resolved) return { slug: resolved, name };
          }

          return null;
        })
      );
      if (!cancelled) {
        setResolvedItems(results.filter(Boolean));
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [cart?.items]);

  // Still resolving
  if (resolvedItems === null) return null;

  if (resolvedItems.length === 0) {
    if (import.meta.env.DEV && (cart?.items || []).length > 0) {
      return (
        <p style={{ fontSize: "0.74rem", color: "#9b9189", marginBottom: 14, fontStyle: "italic" }}>
          [DEV] No se pudo resolver el slug del servicio — panel de booking oculto.
        </p>
      );
    }
    return null;
  }

  const [open, setOpen] = useState(true);

  return (
    <div className="cbp-wrapper">
      <button
        type="button"
        className="cbp-accordion-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="cbp-accordion-toggle__left">
          <span className="cbp-accordion-toggle__dot" />
          <span className="cbp-accordion-toggle__title">Datos del servicio</span>
        </span>
        <ChevronDown
          size={16}
          className="cbp-accordion-toggle__chevron"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="cbp-accordion-body">
          <p className="cbp-header__sub">Selecciona la fecha, hora y extras antes de completar el pago.</p>
          {resolvedItems.map((item) => (
            <ServiceBookingSection
              key={item.slug}
              slug={item.slug}
              serviceName={item.name}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
