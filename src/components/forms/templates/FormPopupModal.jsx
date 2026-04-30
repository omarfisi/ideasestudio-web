import { useEffect } from "react";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";
import FormMediaPanel from "./FormMediaPanel.jsx";

export default function FormPopupModal({
  formConfig,
  placementId,
  onSuccess,
  isOpen,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 p-4">
      <div className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[26px] border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cerrar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="hidden bg-slate-100 lg:block">
            <FormMediaPanel
              formConfig={formConfig}
              className="h-full"
              placeholderClassName="bg-slate-100"
              imageClassName="h-full w-full object-cover"
            />
          </div>

          <div className="px-6 py-8 lg:px-8 lg:py-9">
            {formConfig?.headline ? (
              <h3 className="text-3xl font-semibold text-slate-900">{formConfig.headline}</h3>
            ) : null}
            {formConfig?.subheadline ? (
              <p className="mt-2 text-sm text-slate-500">{formConfig.subheadline}</p>
            ) : null}

            <div className="mt-6">
              <FormFieldsRenderer
                formConfig={formConfig}
                placementId={placementId}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
