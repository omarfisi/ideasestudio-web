import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Small "are you sure?" dialog for membership cancel/reactivate — never
 * the native window.confirm() (unstyleable, blocks the JS thread, and
 * can't show a pending/error state while the request is in flight).
 * Same focus-trap/Escape/scroll-lock/portal pattern as
 * ServiceMembershipPlansModal, just without any data fetching of its own.
 */
export default function MembershipActionConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error = "",
  onConfirm,
  onClose,
}) {
  const panelRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      confirmButtonRef.current?.focus({ preventScroll: true });
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
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-action-confirm-title"
        className="card-light w-full sm:w-[min(92vw,480px)] max-w-full rounded-t-2xl p-6 sm:rounded-2xl"
      >
        <h2 id="membership-action-confirm-title" className="hero-title" style={{ fontSize: "22px" }}>
          {title}
        </h2>
        <p className="body-md mt-3">{description}</p>

        {error ? (
          <p className="mt-3 text-sm font-semibold" style={{ color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="button-text inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 text-center transition disabled:opacity-60"
            style={{ backgroundColor: "#f1f5f9", color: "#111827" }}
          >
            Volver
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="button-text inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 text-center transition disabled:opacity-60"
            style={{ backgroundColor: "var(--ideas-yellow)", color: "var(--ideas-black)" }}
          >
            {pending ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
