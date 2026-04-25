import { useEffect, useMemo, useState } from "react";
import { resolveVisualConfig } from "./presets/defaults.js";
import FormPopupShell from "./presets/FormPopupShell.jsx";
import SplitImagePreset from "./presets/SplitImagePreset.jsx";
import MinimalCardPreset from "./presets/MinimalCardPreset.jsx";
import PopupNewsletterPreset from "./presets/PopupNewsletterPreset.jsx";
import PopupOfferSplitPreset from "./presets/PopupOfferSplitPreset.jsx";
import ContactLandingPreset from "./presets/ContactLandingPreset.jsx";

// Only implemented presets appear here. Unknown preset → error boundary, not silent alias.
const PRESET_COMPONENTS = {
  "split-image": SplitImagePreset,
  "minimal-card": MinimalCardPreset,
  "popup-newsletter": PopupNewsletterPreset,
  "popup-offer-split": PopupOfferSplitPreset,
  "contact-landing": ContactLandingPreset,
};

const VALID_POPUP_TRIGGERS = new Set(["button", "auto", "delay", "exit_intent"]);
const VALID_DISPLAY_MODES = new Set(["embedded", "popup", "both"]);

// ── Popup frequency helpers (unchanged from previous version) ─────────────────

function storageKey(formConfig) {
  return `form_popup_seen_${formConfig?.form_id || formConfig?.slug || "default"}`;
}

function canAutoOpenPopup(formConfig) {
  const freq = formConfig?.popup_frequency || "once_per_session";
  const key = storageKey(formConfig);
  if (typeof window === "undefined") return true;
  if (freq === "always") return true;
  if (freq === "once_per_day") {
    const value = window.localStorage.getItem(key);
    if (!value) return true;
    const last = Number(value);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last > 24 * 60 * 60 * 1000;
  }
  return !window.sessionStorage.getItem(key);
}

function markPopupShown(formConfig) {
  const freq = formConfig?.popup_frequency || "once_per_session";
  const key = storageKey(formConfig);
  if (typeof window === "undefined") return;
  if (freq === "once_per_day") {
    window.localStorage.setItem(key, String(Date.now()));
    return;
  }
  if (freq !== "always") {
    window.sessionStorage.setItem(key, "1");
  }
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export default function PublicFormRenderer({
  formConfig,
  placementId,
  onSuccess,
  previewMode = false,
  forceOpen = false,
}) {
  const config = useMemo(() => resolveVisualConfig(formConfig), [formConfig]);
  const [isPopupOpen, setIsPopupOpen] = useState(Boolean(forceOpen));

  const preset = config.preset;
  const popupConfig = config?.popup || {};

  const rawMode = String(formConfig?.display_mode || config?.display_mode || "embedded").toLowerCase();
  const resolvedMode = VALID_DISPLAY_MODES.has(rawMode)
    ? rawMode
    : "embedded";
  const mode = previewMode && forceOpen ? "popup" : resolvedMode;

  const popupEnabled = popupConfig.enabled !== false && formConfig?.popup_enabled !== false;
  const popupTriggerRaw = String(popupConfig.trigger || "button").toLowerCase();
  const popupTrigger = VALID_POPUP_TRIGGERS.has(popupTriggerRaw) ? popupTriggerRaw : "button";
  const popupDelay = Number(popupConfig.delay_ms ?? formConfig?.popup_delay_ms ?? 3000);

  const shouldRenderInline = mode === "embedded" || mode === "both";
  const shouldRenderPopupTrigger = popupEnabled && (
    (mode === "popup" && popupTrigger === "button") ||
    (mode === "both" && popupTrigger === "button")
  );
  const shouldRenderPopupShell = popupEnabled && (mode === "popup" || mode === "both");

  const PresetComponent = PRESET_COMPONENTS[preset];

  useEffect(() => {
    if (!shouldRenderPopupShell) return undefined;

    if (forceOpen) {
      setIsPopupOpen(true);
      return undefined;
    }

    if (!canAutoOpenPopup(formConfig)) return undefined;
    if (popupTrigger === "button") return undefined;

    if (popupTrigger === "auto") {
      setIsPopupOpen(true);
      if (!previewMode) markPopupShown(formConfig);
      return undefined;
    }

    if (popupTrigger === "delay") {
      const timer = window.setTimeout(() => {
        setIsPopupOpen(true);
        if (!previewMode) markPopupShown(formConfig);
      }, Number.isFinite(popupDelay) ? popupDelay : 3000);
      return () => window.clearTimeout(timer);
    }

    if (popupTrigger === "exit_intent") {
      const onMouseOut = (event) => {
        if (event.relatedTarget) return;
        if (event.clientY > 16) return;
        setIsPopupOpen(true);
        if (!previewMode) markPopupShown(formConfig);
        window.removeEventListener("mouseout", onMouseOut);
      };
      window.addEventListener("mouseout", onMouseOut);
      return () => window.removeEventListener("mouseout", onMouseOut);
    }

    return undefined;
  }, [
    forceOpen,
    formConfig,
    popupDelay,
    popupTrigger,
    previewMode,
    shouldRenderPopupShell,
  ]);

  function openPopup() {
    setIsPopupOpen(true);
    if (!previewMode) markPopupShown(formConfig);
  }

  function closePopup() {
    setIsPopupOpen(false);
  }

  if (!PresetComponent) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        Preset desconocido: <strong>{preset}</strong>
      </div>
    );
  }

  const presetProps = { config, formConfig, placementId, onSuccess };

  // Embedded mode: only inline, never popup trigger/shell.
  if (mode === "embedded") {
    return <PresetComponent {...presetProps} />;
  }

  // Popup mode with popup disabled: render nothing.
  if (mode === "popup" && !popupEnabled) {
    return null;
  }

  const triggerButton = (
    <div className="text-center">
      <button
        type="button"
        onClick={openPopup}
        className="rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{
          backgroundColor: config.colors.button_bg,
          color: config.colors.button_text,
        }}
      >
        {popupConfig.trigger_label || formConfig?.button_label || "Abrir formulario"}
      </button>
    </div>
  );

  // Popup-only mode
  if (mode === "popup") {
    return (
      <>
        {shouldRenderPopupTrigger && triggerButton}
        {shouldRenderPopupShell && (
          <FormPopupShell
            config={config}
            isOpen={isPopupOpen}
            onClose={closePopup}
            previewMode={previewMode}
          >
            <PresetComponent {...presetProps} />
          </FormPopupShell>
        )}
      </>
    );
  }

  // Both mode: inline + popup only in this explicit mode.
  return (
    <>
      {shouldRenderInline && <PresetComponent {...presetProps} />}
      {shouldRenderPopupTrigger && <div className="mt-4">{triggerButton}</div>}
      {shouldRenderPopupShell && (
        <FormPopupShell
          config={config}
          isOpen={isPopupOpen}
          onClose={closePopup}
          previewMode={previewMode}
        >
          <PresetComponent {...presetProps} />
        </FormPopupShell>
      )}
    </>
  );
}
