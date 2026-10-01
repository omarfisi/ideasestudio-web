# JJ Pega — web pública local aislada

Esta documentación pertenece únicamente a la web pública de JJ Pega. No modifica ni reemplaza la documentación de Ideas Estudio.

## Identidad fija

- Tenant: `jjpega`
- Workspace: `0d8c04a8-6be2-4559-93de-0b2be2639f82`
- API local: `http://127.0.0.1:8000`
- Web pública local: `http://127.0.0.1:5176`

## Variables permitidas

La aplicación lee únicamente variables `VITE_JJ_PEGA_*` para API, workspace, Supabase, Stripe y enlaces del CRM. Si falta la configuración, la aplicación falla de forma explícita; no usa el `.env` global ni credenciales o workspace de Ideas Estudio como fallback.

## Validaciones

- Las llamadas públicas agregan el workspace fijo de JJ Pega.
- La configuración de Supabase y Stripe solo proviene de variables `VITE_JJ_PEGA_*`.
- El backend debe rechazar con `403` cualquier workspace distinto al de JJ Pega.
- Los enlaces de productos usan el slug publicado y deben abrir la ficha individual correspondiente.

## Entrega

Trabajar primero en una rama local de JJ Pega, ejecutar pruebas, build y revisión responsive, crear un commit descriptivo y validar el preview antes de preparar PR, merge o despliegue. No tocar la rama ni los artefactos de Ideas Estudio.
