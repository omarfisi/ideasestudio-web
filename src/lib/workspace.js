// FASE 4A — antes apuntaba al workspace legacy "Ideas Estudio"
// (cfdd0b5a-3468-4d5a-86da-50e1f4f324a6), vacío desde que el catálogo
// comercial y todo el contenido público se movieron al workspace "CRM" en
// The JJ Pega workspace is supplied only through VITE_JJ_PEGA_WORKSPACE_ID.
// Missing configuration fails closed instead of falling back to another
// tenant's workspace.
import { JJ_PEGA_WORKSPACE_ID } from "@/lib/jjPegaRuntime.js";

const PUBLIC_WORKSPACE_ID = JJ_PEGA_WORKSPACE_ID;

export { PUBLIC_WORKSPACE_ID };

export function appendWorkspace(url) {
  if (!PUBLIC_WORKSPACE_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}workspace_id=${encodeURIComponent(PUBLIC_WORKSPACE_ID)}`;
}
