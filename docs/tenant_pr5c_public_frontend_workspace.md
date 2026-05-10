# PR-5c — Public Frontend Workspace Propagation

**Date:** 2026-05-10  
**Scope:** ideasestudio-web-public — send workspace_id on all public API calls.

---

## What was done

### New helper: `src/lib/workspace.js`

```js
const PUBLIC_WORKSPACE_ID = import.meta.env.VITE_PUBLIC_WORKSPACE_ID || null;

export function appendWorkspace(url) {
  if (!PUBLIC_WORKSPACE_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}workspace_id=${encodeURIComponent(PUBLIC_WORKSPACE_ID)}`;
}
```

- No workspace_id in env → function is a no-op, URLs unchanged (backward compat).
- workspace_id never hardcoded in components.

### New env var: `.env`

```
VITE_PUBLIC_WORKSPACE_ID=c7e594e2-5218-40fc-9e4b-e830a21d96b3
```

### Files updated

| File | Change |
|---|---|
| `src/lib/publicFormsApi.js` | Import `appendWorkspace`; apply to all paths inside `_apiFetch` — covers placement, by-slug, and form submit |
| `src/lib/publicLeadForms.js` | Import `appendWorkspace`; apply to `/api/public/contact-submit` URL |
| `src/services/storeCheckoutApi.js` | Import `PUBLIC_WORKSPACE_ID`; add `workspace_id` to query objects in `getStoreCategories`, `getStoreProducts`, `getStoreProductBySlug` |

### Endpoints now receiving workspace_id

| Endpoint | Mechanism |
|---|---|
| `GET /api/public/forms/placement/:key` | `appendWorkspace` in `_apiFetch` |
| `GET /api/public/forms/by-slug/:slug` | `appendWorkspace` in `_apiFetch` |
| `POST /api/public/forms/submit` | `appendWorkspace` in `_apiFetch` (query param, not body) |
| `POST /api/public/contact-submit` | `appendWorkspace` on URL |
| `GET /api/store/categories` | `workspace_id` in query object |
| `GET /api/store/products` | `workspace_id` in query object |
| `GET /api/store/products/:slug` | `workspace_id` in query object |

---

## What was NOT done

- No changes to cart, checkout, or order endpoints (those are workspace-agnostic transactions)
- No changes to authenticated `accountApi.js` calls (auth-scoped, not public)
- No enforcement: missing workspace_id → backend returns all results (default-open)

---

## Vercel deploy

`VITE_PUBLIC_WORKSPACE_ID` must be added to Vercel project environment variables for production:

```
VITE_PUBLIC_WORKSPACE_ID=c7e594e2-5218-40fc-9e4b-e830a21d96b3
```
