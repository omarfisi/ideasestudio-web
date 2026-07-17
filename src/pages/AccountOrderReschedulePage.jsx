import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { getMyOrderDetail, postMyOrderReschedule } from "@/lib/accountApi.js";
import { getPublicServiceBooking, getPublicServiceAvailabilityAuthoritative } from "@/lib/publicServicesApi.js";
import { formatPrice } from "@/lib/formatPrice.js";
import { mapOrderPaymentErrorMessage } from "@/lib/orderPaymentState.js";
import { toYMD, addMonths, buildCalendarGrid } from "@/lib/calendarGrid.js";

export default function AccountOrderReschedulePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [order, setOrder] = useState(null);
  const [orderState, setOrderState] = useState({ status: "loading", message: "" });
  const [booking, setBooking] = useState(null);
  const [bookingState, setBookingState] = useState({ status: "idle", message: "" });
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [slots, setSlots] = useState([]);
  const [availState, setAvailState] = useState({ status: "idle", message: "" });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saveState, setSaveState] = useState({ status: "idle", message: "" });

  // Never editable here — service/package/addons are exactly what the
  // customer already contracted (see active_reservation from GET
  // /my/orders/{orderId}, authoritative from service_reservations).
  // Rescheduling only changes starts_at.
  const activeReservation = order?.active_reservation || null;

  useEffect(() => {
    if (!session || !orderId) return;
    let cancelled = false;

    async function load() {
      setOrderState({ status: "loading", message: "" });
      try {
        const data = await getMyOrderDetail(orderId);
        if (!cancelled) {
          setOrder(data.item || null);
          setOrderState({ status: "idle", message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          const code = error instanceof Error ? error.message : null;
          setOrderState({ status: "error", message: mapOrderPaymentErrorMessage(code) });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session, orderId]);

  useEffect(() => {
    const slug = activeReservation?.service_slug;
    if (!slug) return;
    let cancelled = false;

    async function load() {
      setBookingState({ status: "loading", message: "" });
      try {
        const data = await getPublicServiceBooking(slug);
        if (cancelled) return;
        setBooking(data);
        setBookingState({ status: "idle", message: "" });
      } catch {
        if (!cancelled) {
          setBookingState({ status: "error", message: "No pudimos cargar la disponibilidad de este servicio." });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeReservation?.service_slug]);

  useEffect(() => {
    const slug = activeReservation?.service_slug;
    if (!slug || bookingState.status !== "idle") return;
    let cancelled = false;

    async function load() {
      const fromDate = toYMD(calMonth);
      const lastDay = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
      const toDate = toYMD(lastDay);

      setAvailState({ status: "loading", message: "" });
      try {
        const res = await getPublicServiceAvailabilityAuthoritative(slug, {
          fromDate,
          toDate,
          packageId: activeReservation.package_id,
          selectedAddons: activeReservation.selected_addons || [],
        });
        if (cancelled) return;
        setSlots(res.slots || []);
        setAvailState({ status: "idle", message: "" });
      } catch {
        if (!cancelled) {
          setAvailState({ status: "error", message: "No pudimos cargar los horarios disponibles." });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeReservation?.service_slug, activeReservation?.package_id, activeReservation?.selected_addons, bookingState.status, calMonth]);

  async function handleConfirm() {
    if (!selectedSlot) return;
    setSaveState({ status: "loading", message: "" });
    try {
      await postMyOrderReschedule(orderId, selectedSlot.starts_at);
      navigate(`/mi-cuenta/ordenes/${orderId}/pagar`);
    } catch (error) {
      const code = error instanceof Error ? error.message : null;
      setSaveState({ status: "error", message: mapOrderPaymentErrorMessage(code) });
      if (code === "booking_time_slot_not_available") {
        // Someone else took it between availability fetch and confirm —
        // clear the pick and force a fresh availability read for this
        // month, same reasoning as the checkout wizard's resetSignal.
        setSelectedSlot(null);
        setSelectedDate(null);
        setSlots([]);
        setAvailState({ status: "idle", message: "" });
        setCalMonth((current) => new Date(current));
      }
    }
  }

  if (loading) {
    return (
      <div className="account-dashboard-bg">
        <div className="account-loading">Verificando sesión…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate replace to="/mi-cuenta/login" />;
  }

  const slotDates = new Set(slots.map((sl) => sl.date));
  const daySlots = selectedDate ? slots.filter((sl) => sl.date === selectedDate) : [];
  const monthLabel = calMonth.toLocaleString("es", { month: "long", year: "numeric" });
  const calCells = buildCalendarGrid(calMonth.getFullYear(), calMonth.getMonth());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currency = order?.currency || "USD";

  return (
    <div className="account-dashboard-bg">
      <section className="account-dashboard-card order-payment-card">
        <div className="account-topbar">
          <div className="account-breadcrumb">
            <Link to="/mi-cuenta">Mi cuenta</Link>
            <span>›</span>
            {order?.order_number ? (
              <Link to={`/mi-cuenta/ordenes/${orderId}`}>Orden {order.order_number}</Link>
            ) : (
              <span>Orden</span>
            )}
            <span>›</span>
            <strong>Reprogramar</strong>
          </div>
        </div>

        <div className="order-payment-shell">
          {orderState.status === "loading" ? (
            <div className="account-loading">Cargando orden…</div>
          ) : orderState.status === "error" ? (
            <div className="account-empty-state">
              <h3>No pudimos cargar esta orden</h3>
              <p>{orderState.message}</p>
            </div>
          ) : !order ? (
            <div className="account-empty-state">
              <h3>No encontramos esta orden</h3>
            </div>
          ) : !activeReservation?.service_slug ? (
            <div className="account-empty-state">
              <h3>Esta orden no tiene una reserva que reprogramar</h3>
              <p>{mapOrderPaymentErrorMessage("order_not_reschedulable")}</p>
              <Link to={`/mi-cuenta/ordenes/${orderId}`} className="order-detail-link-back" style={{ marginTop: 12 }}>
                ← Volver al detalle de la orden
              </Link>
            </div>
          ) : (
            <>
              <Link to={`/mi-cuenta/ordenes/${orderId}`} className="order-detail-link-back">
                ← Volver al detalle de la orden
              </Link>

              <div className="order-payment-summary">
                <div>
                  <span>Orden</span>
                  <strong>{order.order_number || "—"}</strong>
                </div>
                <div>
                  <span>Servicio</span>
                  <strong>{booking?.service?.name || "—"}</strong>
                </div>
                <div>
                  <span>Total del servicio</span>
                  <strong>{formatPrice(order.grand_total ?? order.total ?? 0, currency)}</strong>
                </div>
              </div>

              <div className="order-payment-panel order-reschedule-panel">
                <h2>Selecciona una nueva fecha y hora</h2>
                <p className="checkout-payment-intro">
                  El servicio, paquete y extras contratados no cambian — solo la fecha.
                </p>

                {bookingState.status === "error" || availState.status === "error" ? (
                  <p className="form-status form-status--error">
                    {bookingState.message || availState.message}
                  </p>
                ) : (
                  <div className="cbp-booking-layout">
                    <div className="cbp-booking-layout__calendar">
                      <div className="cbp-cal-nav">
                        <button
                          type="button"
                          className="cbp-cal-nav__btn"
                          onClick={() => {
                            setCalMonth((c) => addMonths(c, -1));
                            setSelectedDate(null);
                            setSelectedSlot(null);
                          }}
                          aria-label="Mes anterior"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="cbp-cal-nav__month">
                          {monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : ""}
                        </span>
                        <button
                          type="button"
                          className="cbp-cal-nav__btn"
                          onClick={() => {
                            setCalMonth((c) => addMonths(c, 1));
                            setSelectedDate(null);
                            setSelectedSlot(null);
                          }}
                          aria-label="Mes siguiente"
                        >
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
                          const isSel = selectedDate === ymd;
                          const isToday = ymd === toYMD(today);
                          let cls = "cbp-cal-day";
                          if (isPast) cls += " past";
                          else if (isAvail) cls += " available";
                          if (isToday) cls += " today";
                          if (isSel) cls += " selected";
                          return (
                            <button
                              key={ymd}
                              type="button"
                              className={cls}
                              disabled={isPast || !isAvail}
                              onClick={() => { setSelectedDate(ymd); setSelectedSlot(null); }}
                            >
                              {cell.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="cbp-booking-layout__times">
                      <p className="cbp-sub__label">Horarios disponibles</p>
                      {availState.status === "loading" ? (
                        <p className="cbp-notice cbp-notice--placeholder">Cargando horarios…</p>
                      ) : !selectedDate ? (
                        <p className="cbp-notice cbp-notice--placeholder">Selecciona una fecha para ver los horarios disponibles.</p>
                      ) : daySlots.length === 0 ? (
                        <p className="cbp-notice cbp-notice--placeholder">Sin horarios para esta fecha.</p>
                      ) : (
                        <div className="cbp-slots">
                          {daySlots.map((sl) => (
                            <button
                              key={sl.starts_at}
                              type="button"
                              className={`cbp-slot${selectedSlot?.starts_at === sl.starts_at ? " active" : ""}`}
                              onClick={() => setSelectedSlot(sl)}
                            >
                              {sl.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {saveState.status === "error" && (
                  <p className="form-status form-status--error" style={{ marginTop: 16 }}>{saveState.message}</p>
                )}

                <div className="order-reschedule-actions">
                  <button
                    type="button"
                    className="checkout-pay-button"
                    disabled={!selectedSlot || saveState.status === "loading"}
                    onClick={handleConfirm}
                  >
                    {saveState.status === "loading" ? "Guardando…" : "Confirmar nueva fecha"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
