import { useEffect, useRef, useState } from "react";
import { getPublicMembershipPlansByService } from "@/lib/api.js";
import MembershipPlanCards, { PlanCardSkeleton } from "@/components/memberships/MembershipPlanCards.jsx";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Modal showing only the membership plans that include one specific
 * service. Fetches on open (does not depend on the general catalog or
 * any route), closes on Escape/backdrop click, traps focus while open,
 * locks background scroll, and restores focus to whatever triggered it.
 */
export default function ServiceMembershipPlansModal({ serviceId, serviceName, open, onClose }) {
  const [status, setStatus] = useState("idle");
  const [plans, setPlans] = useState([]);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  async function load() {
    if (!serviceId) return;
    setStatus("loading");
    try {
      const items = await getPublicMembershipPlansByService(serviceId);
      setPlans(items);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-membership-plans-modal-title"
        className="card-light flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl p-0 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "rgba(11,11,13,0.1)" }}>
          <div>
            <h2 id="service-membership-plans-modal-title" className="hero-title" style={{ fontSize: "24px" }}>
              Planes disponibles para este servicio
            </h2>
            <p className="body-md mt-2">
              Escoge el plan mensual que mejor se adapte a las necesidades de tu marca.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={serviceName ? `Cerrar planes de ${serviceName}` : "Cerrar"}
            className="flex-shrink-0 rounded-full p-2 transition hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {status === "loading" || status === "idle" ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <PlanCardSkeleton />
              <PlanCardSkeleton />
              <PlanCardSkeleton />
            </div>
          ) : status === "error" ? (
            <div className="card-light max-w-xl" role="alert">
              <p className="body-md mb-4">No pudimos cargar los planes disponibles.</p>
              <button
                type="button"
                onClick={load}
                className="button-text inline-flex items-center justify-center rounded-full px-6 py-3 text-center transition"
                style={{ backgroundColor: "var(--ideas-yellow)", color: "var(--ideas-black)" }}
              >
                Reintentar
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="card-light max-w-xl">
              <p className="body-md">Este servicio todavía no está disponible dentro de un plan mensual.</p>
            </div>
          ) : (
            <MembershipPlanCards plans={plans} />
          )}
        </div>
      </div>
    </div>
  );
}
