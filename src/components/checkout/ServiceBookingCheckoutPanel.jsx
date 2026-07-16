import { useEffect, useReducer, useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getPublicServiceBooking,
  getPublicServiceAvailability,
  getPublicServiceAvailabilityAuthoritative,
} from "@/lib/publicServicesApi.js";
import { resolveProductSlugById } from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { aggregateBookingStatus, isSelectedSlotStillAvailable } from "@/lib/bookingCheckoutSteps.js";

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

// ─── reducer ─────────────────────────────────────────────────────────────────

const SVC_INIT = {
  loadState: "idle",
  booking: null,
  calMonth: null,
  availState: "idle",
  availSource: "authoritative",
  slots: [],
  selectedDate: null,
  selectedSlot: null,
  addonQty: {},
  selectedPackage: null,
  slotInvalidated: false,
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
      return { ...state, calMonth: addMonths(state.calMonth, -1), selectedDate: null, selectedSlot: null, slots: [], slotInvalidated: false };
    case "NEXT_MONTH":
      return { ...state, calMonth: addMonths(state.calMonth, 1), selectedDate: null, selectedSlot: null, slots: [], slotInvalidated: false };
    case "AVAIL_START":
      return { ...state, availState: "loading" };
    case "AVAIL_OK": {
      // Re-checked against every re-fetch (package/addon/date-range/service
      // change) — a duration change (different package, or a
      // duration-affecting addon) can make a previously-picked slot no
      // longer fit. Only invalidate a slot that was actually selected;
      // never invalidate just because the fetch happened to run.
      const stillValid = isSelectedSlotStillAvailable(state.selectedSlot, action.slots);
      return {
        ...state,
        availState: "ready",
        availSource: action.source || state.availSource,
        slots: action.slots,
        selectedSlot: stillValid ? state.selectedSlot : null,
        slotInvalidated: state.selectedSlot ? !stillValid : false,
      };
    }
    case "AVAIL_ERR":
      return { ...state, availState: "error", slots: [] };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date, selectedSlot: null, slotInvalidated: false };
    case "SELECT_SLOT":
      return { ...state, selectedSlot: action.slot, slotInvalidated: false };
    case "SET_ADDON":
      return { ...state, addonQty: { ...state.addonQty, [action.id]: action.qty } };
    case "SET_PACKAGE":
      return { ...state, selectedPackage: action.id };
    default:
      return state;
  }
}

// ─── package cards (shared by the schedule and customize sections) ──────────
// Same visual system as the addon cards below — bordered rounded-rect
// options, not pill chips — so packages and extras read as one consistent
// system instead of two different UI languages for the same kind of choice.

function PackageChips({ packages, selectedId, onSelect }) {
  return (
    <div className="cbp-sub" style={{ marginBottom: 14 }}>
      <p className="cbp-sub__label">Paquete</p>
      <div className="cbp-option-grid">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            className={`cbp-option-card${selectedId === pkg.id ? " active" : ""}`}
            onClick={() => onSelect(pkg.id)}
          >
            <span className="cbp-option-card__name">{pkg.name}</span>
            {pkg.description && <span className="cbp-option-card__desc">{pkg.description}</span>}
            {pkg.price > 0 && (
              <span className="cbp-option-card__price">{formatPrice(pkg.price, pkg.currency)}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── single-service section ───────────────────────────────────────────────────

function ServiceBookingSection({
  slug,
  serviceName,
  section = "hidden",
  onSelectionChange,
  onStatusChange,
}) {
  const [s, dispatch] = useReducer(svcReducer, SVC_INIT);
  const [editingBooking, setEditingBooking] = useState(true);

  useEffect(() => {
    if (!slug) return;
    dispatch({ type: "LOAD_START" });
    getPublicServiceBooking(slug)
      .then((data) => dispatch({ type: "LOAD_OK", data }))
      .catch(() => dispatch({ type: "LOAD_ERR" }));
  }, [slug]);

  const requiresCalendarForAvailability = Boolean(
    s.booking?.booking_settings?.requires_calendar
  );

  useEffect(() => {
    if (s.loadState !== "ready") return;
    if (!requiresCalendarForAvailability) return;
    if (!s.calMonth) return;

    const fromDate = toYMD(s.calMonth);
    const lastDay = new Date(s.calMonth.getFullYear(), s.calMonth.getMonth() + 1, 0);
    const toDate = toYMD(lastDay);
    const selectedAddons = Object.entries(s.addonQty)
      .filter(([, qty]) => qty > 0)
      .map(([addon_id, quantity]) => ({ addon_id, quantity }));

    let cancelled = false;
    dispatch({ type: "AVAIL_START" });

    getPublicServiceAvailabilityAuthoritative(slug, {
      fromDate,
      toDate,
      packageId: s.selectedPackage,
      selectedAddons,
    })
      .then((res) => {
        if (cancelled) return;
        dispatch({ type: "AVAIL_OK", slots: res.slots || [], source: "authoritative" });
      })
      .catch(() => {
        // Explicit compatibility fallback only — never the first choice,
        // since GET ignores package/addon duration and can show a slot the
        // authoritative endpoint would have hidden (or vice versa).
        if (cancelled) return;
        getPublicServiceAvailability(slug, fromDate, toDate)
          .then((res) => {
            if (cancelled) return;
            dispatch({ type: "AVAIL_OK", slots: res.slots || [], source: "legacy_fallback" });
          })
          .catch(() => {
            if (!cancelled) dispatch({ type: "AVAIL_ERR" });
          });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, s.loadState, s.calMonth, requiresCalendarForAvailability, s.selectedPackage, s.addonQty]);

  // A slot invalidated by a package/addon change must not stay hidden
  // behind the "summary" view (editingBooking=false) — reopen the picker
  // so the required-hint message above is actually visible.
  useEffect(() => {
    if (s.slotInvalidated) setEditingBooking(true);
  }, [s.slotInvalidated]);

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

  // Reports this service's booking capabilities/completion to the parent
  // panel so the checkout stepper can build its steps and gate navigation.
  // Fires on error too, so a non-booking item is reported as "resolved,
  // nothing to book" instead of leaving the parent waiting forever.
  useEffect(() => {
    if (!onStatusChange) return;

    if (s.loadState === "error") {
      onStatusChange(slug, {
        slug,
        name: serviceName,
        resolved: true,
        hasCalendar: false,
        hasPackages: false,
        hasAddons: false,
        scheduleComplete: true,
        customizationComplete: true,
      });
      return;
    }
    if (s.loadState !== "ready") return;

    const settings = s.booking?.booking_settings;
    const addons = s.booking?.addons || [];
    const packages = s.booking?.packages || [];
    const hasCalendarNow = Boolean(settings?.requires_calendar);
    const hasPackagesNow = packages.length > 1;
    const hasAddonsNow = addons.length > 0;
    const scheduleCompleteNow = hasCalendarNow
      ? Boolean(s.selectedDate && s.selectedSlot)
      : true;
    const selectedPkg = packages.find((p) => p.id === s.selectedPackage);

    // Read-only display data for the review step. Separate from the
    // onSelectionChange payload sent to the backend — never merged into it.
    onStatusChange(slug, {
      slug,
      name: serviceName,
      resolved: true,
      hasCalendar: hasCalendarNow,
      hasPackages: hasPackagesNow,
      hasAddons: hasAddonsNow,
      scheduleComplete: scheduleCompleteNow,
      customizationComplete: true,
      display: {
        packageName: selectedPkg?.name || null,
        startsAt: s.selectedSlot?.starts_at || null,
        endsAt: s.selectedSlot?.ends_at || null,
        addons: addons
          .filter((a) => (s.addonQty[a.id] ?? 0) > 0)
          .map((a) => ({
            name: a.name,
            quantity: s.addonQty[a.id],
            price: a.price,
            currency: a.currency,
          })),
      },
    });
  }, [
    slug,
    serviceName,
    s.loadState,
    s.selectedDate,
    s.selectedSlot,
    s.selectedPackage,
    s.addonQty,
    s.booking,
    onStatusChange,
  ]);

  const handleAddon = useCallback((id, delta, min, max) => {
    const current = s.addonQty[id] ?? 0;
    dispatch({ type: "SET_ADDON", id, qty: Math.max(min ?? 0, Math.min(max ?? 99, current + delta)) });
  }, [s.addonQty]);

  if (s.loadState === "idle" || s.loadState === "loading") {
    if (section === "hidden") return null;
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
  if (section === "hidden") return null;

  // Packages ride along with the calendar step when there is one (choosing
  // a package can change availability/duration). When this service has no
  // calendar, package selection has nowhere else to live, so it moves into
  // the customize step instead.
  const showScheduleCard = section === "schedule" && hasCalendar;
  const showPackagesInSchedule = hasCalendar;
  const showPackagesInCustomize = section === "customize" && !hasCalendar && hasPkgs;
  const showAddonsCard = section === "customize" && hasAddons;

  if (!showScheduleCard && !showPackagesInCustomize && !showAddonsCard) return null;

  const slotDates = new Set(s.slots.map((sl) => sl.date));
  const daySlots = s.selectedDate ? s.slots.filter((sl) => sl.date === s.selectedDate) : [];
  const monthLabel = s.calMonth?.toLocaleString("es", { month: "long", year: "numeric" });
  const year = s.calMonth?.getFullYear();
  const month = s.calMonth?.getMonth();
  const calCells = hasCalendar ? buildCalendarGrid(year, month) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateLabel = s.selectedDate
    ? new Date(s.selectedDate + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      {/* Fecha y hora content — lives directly in the step body, no
          separate "Reserva del servicio" card/header of its own (the
          outer CheckoutPage step header already says "Fecha y hora"). */}
      {showScheduleCard && (
        <div className="cbp-schedule">
          {/* Package cards — packages ride along with the calendar here */}
          {hasPkgs && showPackagesInSchedule && (
            <PackageChips
              packages={packages}
              selectedId={s.selectedPackage}
              onSelect={(id) => dispatch({ type: "SET_PACKAGE", id })}
            />
          )}

          {/* Summary view when date+slot selected */}
          {hasCalendar && !editingBooking && s.selectedDate && (
            <div className="cbp-schedule-summary">
              <div className="cbp-booking-row">
                <div className="cbp-booking-row__icon">📅</div>
                <div className="cbp-booking-row__info">
                  <span className="cbp-booking-row__label">Fecha</span>
                  <span className="cbp-booking-row__value">{dateLabel}</span>
                </div>
              </div>
              {s.selectedSlot && (
                <div className="cbp-booking-row">
                  <div className="cbp-booking-row__icon">🕐</div>
                  <div className="cbp-booking-row__info">
                    <span className="cbp-booking-row__label">Hora</span>
                    <span className="cbp-booking-row__value">{s.selectedSlot.label}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="cbp-schedule-summary__edit"
                onClick={() => { setEditingBooking(true); dispatch({ type: "SELECT_DATE", date: null }); dispatch({ type: "SELECT_SLOT", slot: null }); }}
              >
                Editar
              </button>
            </div>
          )}

          {/* Calendar + horarios picker — two columns on desktop/tablet
              (calendar left, times right), stacked on mobile. The times
              column always renders once editing, even before a date is
              picked, so the block reads as one balanced composition
              instead of a calendar floating alone with a slot list that
              pops in later. */}
          {hasCalendar && editingBooking && (
            <>
              <div className="cbp-booking-layout">
                <div className="cbp-booking-layout__calendar">
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
                      const isToday = ymd === toYMD(today);
                      let cls = "cbp-cal-day";
                      if (isPast) cls += " past";
                      else if (isAvail) cls += " available";
                      if (isToday) cls += " today";
                      if (isSel) cls += " selected";
                      return (
                        <button key={ymd} type="button" className={cls} disabled={isPast || !isAvail}
                          onClick={() => dispatch({ type: "SELECT_DATE", date: ymd })}>
                          {cell.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cbp-booking-layout__times">
                  <p className="cbp-sub__label">Horarios disponibles</p>
                  {!s.selectedDate ? (
                    <p className="cbp-notice cbp-notice--placeholder">Selecciona una fecha para ver los horarios disponibles.</p>
                  ) : daySlots.length === 0 ? (
                    <p className="cbp-notice cbp-notice--placeholder">Sin horarios para esta fecha.</p>
                  ) : (
                    <div className="cbp-slots">
                      {daySlots.map((sl) => (
                        <button key={sl.starts_at} type="button"
                          className={`cbp-slot${s.selectedSlot?.starts_at === sl.starts_at ? " active" : ""}`}
                          onClick={() => {
                            dispatch({ type: "SELECT_SLOT", slot: sl });
                            setEditingBooking(false);
                          }}>
                          {sl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!s.selectedSlot && (
                <p className="cbp-required-hint">
                  {s.slotInvalidated
                    ? "Ese horario ya no está disponible con tu selección actual. Elige otro horario."
                    : "Selecciona fecha y hora para continuar."}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Paquete (solo cuando el servicio no tiene calendario) — mismo
          sistema visual que Extras, sin card propia. */}
      {showPackagesInCustomize && (
        <div className="cbp-customize-block">
          <PackageChips
            packages={packages}
            selectedId={s.selectedPackage}
            onSelect={(id) => dispatch({ type: "SET_PACKAGE", id })}
          />
        </div>
      )}

      {/* Extras — 2-column grid of compact option cards, not a narrow
          vertical list; no separate "Extras opcionales" card (the outer
          step header already says "Personaliza"). */}
      {showAddonsCard && (
        <div className="cbp-customize-block">
          <p className="cbp-sub__label">Extras opcionales</p>
          <div className="cbp-addons-grid">
            {addons.map((a) => {
              const qty = s.addonQty[a.id] ?? 0;
              return (
                <div key={a.id} className={`cbp-addon-card${qty > 0 ? " has-qty" : ""}`}>
                  <div className="cbp-addon-card__info">
                    <span className="cbp-addon-card__name">{a.name}</span>
                    {a.description && <span className="cbp-addon-card__desc">{a.description}</span>}
                    {a.price > 0 && <span className="cbp-addon-card__price">+{formatPrice(a.price, a.currency)}</span>}
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
        </div>
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

export default function ServiceBookingCheckoutPanel({
  cart,
  section = "hidden",
  onSelectionChange,
  onStatusChange,
}) {
  const [resolvedItems, setResolvedItems] = useState(null);
  const [resolutionFailures, setResolutionFailures] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const rawItems = cart?.items || [];
    let cancelled = false;

    async function resolve() {
      const results = await Promise.all(
        rawItems.map(async (item) => {
          const name = item.snapshotName || item.product?.name || "Servicio";

          // 1. Try direct slug fields
          const directSlug = getSlugFromItem(item);
          if (directSlug) return { slug: directSlug, name, resolved: true };

          // 2. Check metadata fields (backend may store slug in snapshot metadata)
          const meta = item.metadata || {};
          const metaSlug =
            meta.slug ||
            meta.service_slug ||
            meta.product_slug ||
            meta.serviceSlug ||
            null;
          if (metaSlug) return { slug: metaSlug, name, resolved: true };

          // 3. Resolve by productId via store API
          if (item.productId) {
            const resolvedSlug = await resolveProductSlugById(item.productId);
            if (resolvedSlug) return { slug: resolvedSlug, name, resolved: true };
          }

          // Genuinely could not resolve a slug for this cart item — this is
          // NOT the same as "confirmed not a booking service" (see below).
          return { slug: null, name, resolved: false };
        })
      );
      // Promise.all([]) still resolves asynchronously, so an empty cart
      // reaches this same branch instead of needing a synchronous
      // early-return setState in the effect body.
      if (!cancelled) {
        setResolvedItems(results.filter((r) => r.resolved));
        setResolutionFailures(results.filter((r) => !r.resolved));
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [cart?.items]);

  const handleSectionStatus = useCallback((slug, info) => {
    setStatusMap((current) => ({ ...current, [slug]: info }));
  }, []);

  useEffect(() => {
    if (!onStatusChange) return;

    if (resolvedItems === null) {
      onStatusChange({
        status: "loading",
        hasBooking: false,
        requiresCalendar: false,
        hasCustomization: false,
        scheduleComplete: false,
        customizationComplete: false,
        services: [],
        resolutionErrors: [],
      });
      return;
    }

    const reportedStatuses = resolvedItems.map(
      (item) => statusMap[item.slug] || { slug: item.slug, name: item.name, resolved: false }
    );
    // A cart item whose slug could never be resolved is reported as a real
    // resolutionError, not folded into "no booking" — a booking service
    // that failed to resolve must never silently look confirmed-safe.
    const failureStatuses = resolutionFailures.map((failure, index) => ({
      slug: `__unresolved_${index}`,
      name: failure.name,
      resolved: true,
      resolutionError: true,
      hasCalendar: false,
      hasPackages: false,
      hasAddons: false,
      scheduleComplete: false,
      customizationComplete: false,
    }));

    const aggregate = aggregateBookingStatus(
      [...reportedStatuses, ...failureStatuses],
      resolvedItems.length + resolutionFailures.length
    );

    if (import.meta.env.DEV) {
      console.log("[booking-checkout] status:", aggregate.status, aggregate);
    }

    onStatusChange(aggregate);
  }, [resolvedItems, resolutionFailures, statusMap, onStatusChange]);

  // Still resolving which cart items even have a slug
  if (resolvedItems === null) return null;

  if (resolvedItems.length === 0) {
    if (import.meta.env.DEV && (cart?.items || []).length > 0 && section !== "hidden") {
      return (
        <p style={{ fontSize: "0.74rem", color: "#9b9189", marginBottom: 14, fontStyle: "italic" }}>
          [DEV] No se pudo resolver el slug del servicio — panel de booking oculto.
        </p>
      );
    }
    return null;
  }

  if (section === "hidden") {
    // Keep every ServiceBookingSection mounted (reducers alive, no reload of
    // availability, no lost date/slot/package/addons) — just render nothing.
    return (
      <div style={{ display: "none" }}>
        {resolvedItems.map((item) => (
          <ServiceBookingSection
            key={item.slug}
            slug={item.slug}
            serviceName={item.name}
            section={section}
            onSelectionChange={onSelectionChange}
            onStatusChange={handleSectionStatus}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="cbp-wrapper">
      {resolvedItems.map((item) => (
        <ServiceBookingSection
          key={item.slug}
          slug={item.slug}
          serviceName={item.name}
          section={section}
          onSelectionChange={onSelectionChange}
          onStatusChange={handleSectionStatus}
        />
      ))}
    </div>
  );
}
