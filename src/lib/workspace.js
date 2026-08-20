const DEFAULT_PUBLIC_WORKSPACE_ID = "cfdd0b5a-3468-4d5a-86da-50e1f4f324a6";

const PUBLIC_WORKSPACE_ID =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_PUBLIC_WORKSPACE_ID) ||
  DEFAULT_PUBLIC_WORKSPACE_ID;

export { PUBLIC_WORKSPACE_ID };

export function appendWorkspace(url) {
  if (!PUBLIC_WORKSPACE_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}workspace_id=${encodeURIComponent(PUBLIC_WORKSPACE_ID)}`;
}
