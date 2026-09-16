# Plan: Testimonios por Workspace

## Estado actual — Fase 1.2

- Migración `20260915_01_workspace_testimonials.sql` aplicada en Supabase.
- Tabla y políticas RLS activas por `workspace_id`.
- Repositorio y API administrativa creados en la rama backend `jj-pega-backend`.
- Pruebas automatizadas de aislamiento de consultas: 3/3 aprobadas.
- La prueba con miembros exclusivos queda pendiente porque la cuenta actual tiene membresías compartidas en ambos workspaces; no se modificaron membresías reales para forzarla.

## Objetivo

Crear un único módulo de testimonios dentro del CRM, con datos y permisos aislados por `workspace_id`. Ideas Estudio y JJ Pega usarán el mismo módulo sin compartir testimonios, configuraciones ni publicaciones por accidente.

## Alcance

- Administrar testimonios desde el CRM.
- Filtrar siempre por workspace activo.
- Mantener el componente visual reutilizable.
- Migrar los testimonios actuales de Ideas Estudio sin cambiar su apariencia.
- Crear la colección independiente de testimonios de JJ Pega.
- Permitir publicar, ocultar, ordenar y editar testimonios.

## Modelo de datos

Tabla `workspace_testimonials`:

- `id`
- `workspace_id`
- `name`
- `quote`
- `rating`
- `source`
- `source_url`
- `avatar_url`
- `role_or_meta`
- `status`: `draft`, `published`, `hidden`
- `sort_order`
- `created_at`
- `updated_at`

Índices recomendados:

- `(workspace_id, status, sort_order)`
- `(workspace_id, created_at)`

## Seguridad

- Activar RLS.
- Ningún usuario puede leer o modificar testimonios fuera de su workspace.
- Las páginas públicas solo consultan testimonios publicados del workspace correspondiente.
- Las operaciones administrativas requieren permisos del workspace.
- No usar un workspace por defecto silencioso para evitar cruces entre Ideas Estudio y JJ Pega.

## Fases

### Fase 1: Base y aislamiento

1. Confirmar los `workspace_id` de Ideas Estudio y JJ Pega.
2. Crear migración para `workspace_testimonials`.
3. Crear políticas RLS y pruebas de aislamiento.
4. Crear repositorio o API con `workspace_id` obligatorio.

### Fase 2: Migración de Ideas Estudio

1. Convertir `src/data/testimonials.js` en registros del workspace de Ideas Estudio.
2. Mantener nombres, fuentes, estrellas, etiquetas y textos actuales.
3. Conservar el diseño y el comportamiento actual del slider.
4. Comparar antes y después para asegurar que no cambie la página pública.

### Fase 3: Módulo del CRM

1. Añadir sección `Testimonios` al CRM.
2. Mostrar el workspace activo de forma visible.
3. Crear listado con búsqueda, filtros y estados.
4. Añadir formulario para crear y editar.
5. Añadir acciones publicar, ocultar, duplicar y eliminar.
6. Permitir ordenar manualmente.

### Fase 4: Integración de JJ Pega

1. Crear testimonios iniciales de JJ Pega.
2. Reemplazar las tarjetas hardcodeadas de `StorePage.jsx`.
3. Conectar la tienda al mismo componente visual, filtrado por workspace.
4. Mantener el banner de clientes separado del listado de testimonios.

### Fase 5: Validación

- Crear un testimonio en Ideas Estudio y confirmar que no aparece en JJ Pega.
- Crear uno en JJ Pega y confirmar que no aparece en Ideas Estudio.
- Verificar publicación y ocultación.
- Verificar orden en desktop y móvil.
- Probar usuario sin permiso y acceso directo a otro workspace.
- Revisar que las páginas públicas solo muestren registros `published`.

## Orden de implementación

1. Migración y RLS.
2. API/repositorio con workspace obligatorio.
3. Migración de Ideas Estudio.
4. Panel CRM.
5. Integración de JJ Pega.
6. Pruebas de aislamiento.
7. Preview visual y PR separado.

## Fuera de alcance inicial

- Importación automática desde Google Reviews.
- Moderación con IA.
- Analítica avanzada de conversiones.
- Sincronización automática con redes sociales.

Estas funciones pueden añadirse después sin cambiar el aislamiento por workspace.
