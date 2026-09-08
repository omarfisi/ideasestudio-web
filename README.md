# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Public Chat Quick Replies, entorno local

La web pública se valida en el puerto oficial `5196` y consume el backend
local del stack en `127.0.0.1:8000`. El CRM utiliza el puerto `5173`.

El backend Quick Replies se sirve desde:

```text
/Users/osvaldomarfisi/Proyectos/worktrees/aira-content-support-backend
```

Iniciar y consultar el stack únicamente mediante los launchers oficiales,
manteniendo el mismo override de backend:

```bash
IDEAS_BACKEND_DIR='/Users/osvaldomarfisi/Proyectos/worktrees/aira-content-support-backend' \\
~/scripts/start_ideas_stack.sh

IDEAS_BACKEND_DIR='/Users/osvaldomarfisi/Proyectos/worktrees/aira-content-support-backend' \\
~/scripts/status_ideas_stack.sh

IDEAS_BACKEND_DIR='/Users/osvaldomarfisi/Proyectos/worktrees/aira-content-support-backend' \\
~/scripts/stop_ideas_stack.sh
```

No usar `5174`, procesos Vite/Uvicorn manuales ni configurar secretos en este
README.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
