// Single source of truth for the contact/social values shown in both
// Header.jsx (topbar) and Footer.jsx — previously each hardcoded its own
// copy, with no shared config, so a future change to any of these risked
// updating one and forgetting the other.
import { SITE_CONFIG } from "@/lib/siteConfig.js";

export const SITE_CONTACT = {
  email: SITE_CONFIG.contact.email,
  phone: null,
  social: SITE_CONFIG.contact.social,
};
