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
    return data?.entry || null;
  } catch {
    return null;
  }
}
