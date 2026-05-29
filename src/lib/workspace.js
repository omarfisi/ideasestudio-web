const DEFAULT_PUBLIC_WORKSPACE_ID = "c7e594e2-5218-40fc-9e4b-e830a21d96b3";

const PUBLIC_WORKSPACE_ID =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_PUBLIC_WORKSPACE_ID) ||
  DEFAULT_PUBLIC_WORKSPACE_ID;

export { PUBLIC_WORKSPACE_ID };

export function appendWorkspace(url) {
  if (!PUBLIC_WORKSPACE_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}workspace_id=${encodeURIComponent(PUBLIC_WORKSPACE_ID)}`;
}
