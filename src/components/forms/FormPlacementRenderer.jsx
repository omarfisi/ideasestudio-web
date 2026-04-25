import { useEffect, useState } from "react";
import { getFormByPlacement } from "@/lib/publicFormsApi.js";
import PublicFormRenderer from "./PublicFormRenderer.jsx";

export default function FormPlacementRenderer({
  sectionKey,
  fallback = null,
  onSuccess,
}) {
  const [formConfig, setFormConfig] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!sectionKey) {
      setStatus("empty");
      return;
    }

    let cancelled = false;

    getFormByPlacement(sectionKey)
      .then((data) => {
        if (cancelled) return;
        setFormConfig(data);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (status !== "ready" || !formConfig) {
    return fallback ?? null;
  }

  return (
    <PublicFormRenderer
      formConfig={formConfig}
      placementId={formConfig?.placement_id}
      onSuccess={onSuccess}
    />
  );
}
