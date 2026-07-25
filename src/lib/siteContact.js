// Single source of truth for the contact/social values shown in both
// Header.jsx (topbar) and Footer.jsx — previously each hardcoded its own
// copy, with no shared config, so a future change to any of these risked
// updating one and forgetting the other.
export const SITE_CONTACT = {
  email: "omarfisi@ideasestudiopr.com",
  phone: {
    display: "1-787-503-0349",
    href: "tel:17875030349",
  },
  social: {
    facebook: "https://www.facebook.com/ideasestudiopr",
    instagram: "https://www.instagram.com/ideasestudiopr/",
    youtube: "https://www.youtube.com/@ideasestudio",
  },
};
