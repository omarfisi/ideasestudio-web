// Full visual_config defaults per preset.
// resolveVisualConfig merges user overrides (from DB) on top of these defaults.
// NEVER return {} as fallback — always return a complete config object.

export const PRESET_DEFAULTS = {
  "split-image": {
    preset: "split-image",
    display_mode: "embedded",
    container: {
      max_width: "1200px",
      padding: "0",
      radius: "28px",
      shadow: "xl",
      gap: "0",
    },
    colors: {
      page_background: "transparent",
      card_background: "#FFFFFF",
      text: "#111827",
      muted_text: "#6B7280",
      button_bg: "#111827",
      button_text: "#FFFFFF",
      input_bg: "#FFFFFF",
      input_border: "#E5E7EB",
    },
    media: {
      enabled: true,
      type: "image",
      image_url: "",
      youtube_url: "",
      position: "left",
      width_ratio: "50",
      object_fit: "cover",
      overlay: false,
      overlay_opacity: 0.2,
      radius: "0",
    },
    content: {
      show_eyebrow: true,
      show_headline: true,
      show_description: true,
      show_disclaimer: false,
      show_button: true,
      alignment: "left",
    },
    popup: {
      enabled: false,
      show_close: true,
      backdrop: true,
      width: "900px",
      trigger_label: "Abrir formulario",
      trigger: "button",
      delay_ms: 1500,
    },
  },

  "minimal-card": {
    preset: "minimal-card",
    display_mode: "embedded",
    container: {
      max_width: "900px",
      padding: "28px",
      radius: "30px",
      shadow: "xl",
      gap: "0",
    },
    colors: {
      page_background: "#f3b54c",
      card_background: "#fbfaf7",
      text: "#111827",
      muted_text: "#6B7280",
      button_bg: "#111827",
      button_text: "#FFFFFF",
      input_bg: "#FFFFFF",
      input_border: "#fed7aa",
    },
    media: {
      enabled: true,
      type: "image",
      image_url: "",
      youtube_url: "",
      position: "left",
      width_ratio: "40",
      object_fit: "cover",
      overlay: false,
      overlay_opacity: 0,
      radius: "20px",
    },
    content: {
      show_eyebrow: false,
      show_headline: true,
      show_description: true,
      show_disclaimer: false,
      show_button: true,
      alignment: "left",
    },
    popup: {
      enabled: false,
      show_close: true,
      backdrop: true,
      width: "800px",
      trigger_label: "Abrir formulario",
      trigger: "button",
      delay_ms: 1500,
    },
  },

  "popup-newsletter": {
    preset: "popup-newsletter",
    display_mode: "popup",
    container: {
      max_width: "560px",
      padding: "0",
      radius: "26px",
      shadow: "2xl",
      gap: "0",
    },
    colors: {
      page_background: "transparent",
      card_background: "#FFFFFF",
      text: "#111827",
      muted_text: "#6B7280",
      button_bg: "#16a34a",
      button_text: "#FFFFFF",
      input_bg: "#FFFFFF",
      input_border: "#E5E7EB",
    },
    media: {
      enabled: false,
      type: "none",
      image_url: "",
      youtube_url: "",
      position: "top",
      width_ratio: "50",
      object_fit: "cover",
      overlay: false,
      overlay_opacity: 0,
      radius: "0",
    },
    content: {
      show_eyebrow: true,
      show_headline: true,
      show_description: true,
      show_disclaimer: true,
      show_button: true,
      alignment: "center",
    },
    popup: {
      enabled: true,
      show_close: true,
      backdrop: true,
      width: "560px",
      trigger_label: "Suscribirse",
      trigger: "button",
      delay_ms: 1500,
    },
  },

  "popup-offer-split": {
    preset: "popup-offer-split",
    display_mode: "popup",
    theme: "light",
    container: {
      max_width: "1100px",
      padding: "0px",
      radius: "28px",
      shadow: "2xl",
      gap: "0px",
      alignment: "center",
    },
    colors: {
      page_background: "rgba(0,0,0,0.55)",
      card_background: "#FFFFFF",
      text: "#111111",
      muted_text: "#5F6368",
      button_bg: "#4F8EF7",
      button_text: "#FFFFFF",
      input_bg: "#FFFFFF",
      input_border: "#E5E7EB",
      overlay_color: "#000000",
    },
    media: {
      enabled: true,
      type: "image",
      image_url: "",
      youtube_url: "",
      position: "right",
      width_ratio: "45",
      object_fit: "cover",
      overlay: false,
      overlay_opacity: 0.15,
      radius: "0px",
    },
    content: {
      show_eyebrow: false,
      show_headline: true,
      show_description: true,
      show_disclaimer: true,
      show_button: true,
      alignment: "center",
    },
    popup: {
      enabled: true,
      show_close: true,
      backdrop: true,
      width: "1100px",
      trigger_label: "Suscribirse",
      trigger: "button",
      delay_ms: 1500,
    },
  },

  "contact-landing": {
    preset: "contact-landing",
    display_mode: "embedded",
    container: {
      max_width: "1200px",
      padding: "0",
      radius: "28px",
      shadow: "xl",
      gap: "0",
    },
    colors: {
      page_background: "transparent",
      card_background: "#FFFFFF",
      text: "#111827",
      muted_text: "#6B7280",
      button_bg: "#111827",
      button_text: "#FFFFFF",
      input_bg: "#FFFFFF",
      input_border: "#E5E7EB",
    },
    media: {
      enabled: true,
      type: "image",
      image_url: "",
      youtube_url: "",
      position: "left",
      width_ratio: "60",
      object_fit: "cover",
      overlay: true,
      overlay_opacity: 0.35,
      radius: "0",
    },
    content: {
      show_eyebrow: true,
      show_headline: true,
      show_description: true,
      show_disclaimer: false,
      show_button: true,
      alignment: "left",
    },
    popup: {
      enabled: false,
      show_close: true,
      backdrop: true,
      width: "900px",
      trigger_label: "Contactar",
      trigger: "button",
      delay_ms: 1500,
    },
  },
};

// Maps old design_variant values to new preset keys for backward compat
const LEGACY_PRESET_MAP = {
  "split-photo-clean": "split-image",
  "split-dark-glow": "split-image",
  "minimal-warm": "minimal-card",
  "popup-clean": "popup-newsletter",
  "popup-offer-split": "popup-offer-split",
};

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      override[key] !== undefined &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === "object"
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else if (override[key] !== undefined && override[key] !== null) {
      result[key] = override[key];
    }
  }
  return result;
}

// Returns a complete, merged visual_config ready to pass to preset components.
// Never returns null or {}.
export function resolveVisualConfig(formConfig) {
  const raw = formConfig?.visual_config;

  let preset = raw?.preset;
  if (!preset) {
    preset = LEGACY_PRESET_MAP[formConfig?.design_variant] || "split-image";
  }

  const defaults = PRESET_DEFAULTS[preset] || PRESET_DEFAULTS["split-image"];
  const merged = deepMerge(defaults, raw || {});

  // Sync top-level image_url/youtube_url if not set inside visual_config.media
  if (!merged.media.image_url && formConfig?.image_url) {
    merged.media = { ...merged.media, image_url: formConfig.image_url };
  }
  if (!merged.media.youtube_url && formConfig?.youtube_url) {
    merged.media = { ...merged.media, youtube_url: formConfig.youtube_url };
  }

  return merged;
}
