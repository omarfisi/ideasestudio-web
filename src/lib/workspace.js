// FASE 4A — antes apuntaba al workspace legacy "Ideas Estudio"
// (cfdd0b5a-3468-4d5a-86da-50e1f4f324a6), vacío desde que el catálogo
// comercial y todo el contenido público se movieron al workspace "CRM" en
// PR-5c/5d (mayo 2026). Ver WORKSPACE_CONFIGURATION_DECISION_REPORT
// (FASE 3D) y el hallazgo de FASE 4: si VITE_PUBLIC_WORKSPACE_ID llegara a
// faltar en cualquier entorno, este fallback debe seguir siendo el
// workspace activo real, nunca el legacy vacío.
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
