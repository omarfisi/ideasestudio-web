import { useEffect } from "react";

// Backdrop + close button wrapper for popup display mode.
// Does NOT add its own card/border — the preset component inside provides that.
export default function FormPopupShell({
  config,
  isOpen,
  onClose,
  children,
  previewMode = false,
}) {
  const { popup } = config;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (popup.backdrop && e.target === e.currentTarget) onClose?.();
  }

  const wrapperClass = previewMode
    ? "absolute inset-0 z-[60] flex items-center justify-center p-4"
    : "fixed inset-0 z-[999] flex items-center justify-center p-4";

  return (
    <div
      className={wrapperClass}
      style={{ backgroundColor: popup.backdrop ? "rgba(0,0,0,0.65)" : "transparent" }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative max-h-[92vh] w-full overflow-auto"
        style={{ maxWidth: popup.width || "900px" }}
      >
        {popup.show_close && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
