# BASELINE-020 — Adaptador del catálogo público

## Problema

El Backend local entregaba correctamente productos con el contrato de catálogo
(`product_type`, `is_active`), pero la bandeja de servicios de la Web filtraba
solo los nombres normalizados (`productType`, `isActive`). Además, la lectura
opcional de `import.meta.env` impedía que Vite sustituyera el workspace público
configurado, dejando la Web apuntando al workspace por defecto.

## Corrección

- `src/lib/workspace.js` lee `import.meta.env.VITE_PUBLIC_WORKSPACE_ID` con la
  forma compatible con la sustitución de Vite.
- `src/pages/StorePage.jsx` acepta tanto el contrato normalizado como el
  contrato heredado en snake_case al filtrar servicios activos.
- Se añadieron pruebas para ambos formatos y para excluir productos digitales
  o inactivos.

## Validación local

Con el Backend baseline en `127.0.0.1:8002`, el workspace sintético
`80000000-0000-0000-0000-000000000001` y la Web en `127.0.0.1:5174`:

- el proxy y el Backend devolvieron 1 producto de servicio;
- la Web mostró `1 de 1 servicios activos`;
- la tarjeta visible fue `Sesión fotográfica Baseline QA` con precio `$150.00`;
- pruebas dirigidas: 15/15 aprobadas;
- build de producción: aprobado, con la advertencia conocida de bundles grandes.

No se modificaron Supabase, producción, `55929` ni ningún worktree de JJPega.
