import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getPublicMembershipPlansByService } from "@/lib/api.js";
import MembershipPlanCards, { PlanCardSkeleton } from "@/components/memberships/MembershipPlanCards.jsx";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Modal showing only the membership plans that include one specific
 * service. Closes on Escape/backdrop click, traps focus while open,
 * locks background scroll, and restores focus to whatever triggered it.
 *
 * By default it fetches on open (does not depend on the general catalog
 * or any route) — but a caller that already knows the plans (e.g.
 * ProductDetailPage, which needs that same answer to decide which CTA to
 * show before the modal even opens) can pass `plans`/`loading`/`error`
 * directly, and this component uses them as-is instead of firing its own
 * request. If the controlled `error` state is hit, "Reintentar" falls
 * back to the component's own fetch — the caller isn't expected to wire
 * up a retry path for a modal it isn't rendering yet.
 */
export default function ServiceMembershipPlansModal({
  serviceId,
  serviceName,
  open,
  onClose,
  plans: controlledPlans,
  loading: controlledLoading,
  error: controlledError,
}) {
  const isControlled = controlledPlans !== undefined;
  const [status, setStatus] = useState("idle");
  const [plans, setPlans] = useState([]);
  const [useLocalState, setUseLocalState] = useState(!isControlled);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const navigate = useNavigate();

  // Callers (ServiceMembershipPlansTrigger, ProductDetailPage) pass
  // onClose as a plain inline arrow function, so its identity is new on
  // every one of THEIR renders — not just when open/close actually
  // toggles. Reading it through a ref (kept current on every render, no
  // dependency array) instead of closing over it directly means the
  // effect below can depend on [open] alone: it no longer tears down and
  // rebuilds (re-locking scroll, re-focusing, re-attaching the keydown
  // listener) on every incidental parent re-render while the modal is
  // open — which is what was producing the flicker/scroll-jump reported
  // in production (the background "Conocer planes" button re-stealing
  // focus, and the browser auto-scrolling to it, on every such re-render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // "Seleccionar este plan" never adds anything to a cart and never
  // calls the backend from here — it only carries the selection to the
  // dedicated membership checkout via router state. That destination
  // page re-validates plan+service against the backend itself (see
  // MembershipCheckoutPage) rather than trusting this payload alone.
  function handleSelectPlan(plan) {
    navigate("/membresias/checkout", {
      state: { membershipPlanId: plan.id, serviceId },
    });
  }

  async function load() {
    if (!serviceId) return;
    setUseLocalState(true);
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
    setUseLocalState(!isControlled);
    if (!isControlled) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId]);

  const effectivePlans = useLocalState ? plans : controlledPlans;
  const effectiveStatus = useLocalState
    ? status
    : controlledError
    ? "error"
    : controlledLoading
    ? "loading"
    : "ready";

  // Scroll lock — reacts to `open` only. Split out from the focus-trap
  // effect below so a re-render that doesn't actually change `open`
  // never toggles body.style.overflow off and back on.
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus trap + Escape — reacts to `open` only (onClose is read through
  // onCloseRef, never as a dependency here — see its declaration above).
  useEffect(() => {
    if (!open) return undefined;

    const focusTimer = setTimeout(() => {
      // preventScroll: this element may already be visible behind the
      // modal — without it, focusing programmatically can make the
      // browser scroll the page to bring it into view, which reads as
      // the background content "jumping" while the modal is open.
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 0);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
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
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  // Portal to document.body: this modal is rendered from inside per-card
  // trigger components (catalog ProductCard, ProductDetailPage's sticky
  // mobile CTA), and those ancestors use `transform`/`backdrop-filter`
  // for hover/slide effects (see .product-card:hover and
  // .service-detail-mobile-cta in App.css). Per the CSS spec, ANY
  // transform/filter/backdrop-filter/perspective on an ancestor makes
  // it the containing block for a `position: fixed` descendant — so
  // without a portal, this modal was positioned and clipped relative to
  // that small card instead of the viewport the instant the ancestor's
  // hover state toggled, producing the fragmented/duplicated-looking
  // render reported in production.
  return createPortal(
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
        className="card-light flex max-h-[92vh] w-full sm:w-[min(96vw,1400px)] max-w-full sm:max-w-7xl flex-col overflow-hidden rounded-t-2xl p-0 sm:rounded-2xl"
      >
        <div
          className="flex flex-shrink-0 items-start justify-between gap-4 border-b p-5"
          style={{ borderColor: "rgba(11,11,13,0.1)" }}
        >
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

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
          {effectiveStatus === "loading" || effectiveStatus === "idle" ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <PlanCardSkeleton />
              <PlanCardSkeleton />
              <PlanCardSkeleton />
            </div>
          ) : effectiveStatus === "error" ? (
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
          ) : effectivePlans.length === 0 ? (
            <div className="card-light max-w-xl">
              <p className="body-md">Este servicio todavía no está disponible dentro de un plan mensual.</p>
            </div>
          ) : (
            <MembershipPlanCards plans={effectivePlans} onSelectPlan={handleSelectPlan} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
