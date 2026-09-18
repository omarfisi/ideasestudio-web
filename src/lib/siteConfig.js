/**
 * Public brand configuration for the JJ Pega storefront.
 * Keep this separate from CRM/admin configuration so public requests never
 * fall back to another workspace's brand or infrastructure.
 */
export const SITE_CONFIG = {
  name: "JJ Pega",
  legalName: "JJ Pega",
  siteUrl: "https://jjpega.com",
  // Tenant-specific; supplied by each environment, never hardcoded.
  publicWorkspaceId: (import.meta.env.VITE_PUBLIC_WORKSPACE_ID || "").trim(),
  crmApiUrl: import.meta.env.VITE_CRM_BASE_URL || "",
  crmAppUrl: import.meta.env.VITE_APP_CRM_URL || "",
  contact: {
    email: "info@jjpega.com",
    phone: null,
    social: {
      facebook: import.meta.env.VITE_JJ_PEGA_FACEBOOK_URL || "",
      instagram: import.meta.env.VITE_JJ_PEGA_INSTAGRAM_URL || "",
      youtube: import.meta.env.VITE_JJ_PEGA_YOUTUBE_URL || "",
    },
  },
};

export function isJjPegaHost(
  hostname = typeof window !== "undefined" ? window.location?.hostname : "",
) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return host === "jjpega.com" || host === "jj-pega.vercel.app";
}
