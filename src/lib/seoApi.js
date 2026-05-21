import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";

function getBaseUrl() {
  return (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

export async function getPublicSeo(path) {
  const base = getBaseUrl();
  if (!base || !path) return null;
  try {
    const url = `${base}/public/seo?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    // API returns { ok, found, seo: {...} } — "seo" is the entry key, NOT "entry"
    if (!data?.found) return null;
    return data?.seo || null;
  } catch {
    return null;
  }
}

export async function getPublicPage(path) {
  const base = getBaseUrl();
  if (!base || !path) return null;
  try {
    const url = `${base}/public/pages/by-path?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.page || null;
  } catch {
    return null;
  }
}
