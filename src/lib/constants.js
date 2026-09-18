import { SITE_CONFIG } from "@/lib/siteConfig.js";

export const APP_CRM_URL = SITE_CONFIG.crmAppUrl;

export const CRM_PUBLIC_API_BASE_URL = import.meta.env.VITE_CRM_BASE_URL || "";
