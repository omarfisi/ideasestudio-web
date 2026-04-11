# Contact Submit Contract (FastAPI)

## Objective

Implement a public endpoint in the CRM backend to orchestrate the website contact flow:

1. Upsert contact by email.
2. Assign segment(s).
3. Create pending lead/task in LeadBooster.
4. Send internal notification email.
5. Return stable JSON response for frontend.

## Endpoint

- Method: `POST`
- Path: `/api/public/contact-submit`
- Auth: public (rate-limited + anti-spam at gateway/middleware level)

## Request JSON

```json
{
  "full_name": "Juan Perez",
  "email": "juan@email.com",
  "phone": "7871234567",
  "business_name": "Negocio XYZ",
  "service_interest": "Diseno Web",
  "message": "Quiero informacion sobre sus servicios.",
  "source": "website_contact",
  "segment": "pagina_contacto",
  "segments": ["pagina_contacto", "nuevos_suscriptores"],
  "meta": {
    "mode": "proposal",
    "service_slug": "diseno-web",
    "client_type": "small_business",
    "page_origin": "/contacto",
    "origin_cta": "services_catalog",
    "submit_cta": "contact_form_submit",
    "submitted_at": "2026-04-08T12:00:00.000Z"
  }
}
```

## Validation Rules

- `full_name`: required, trim, min length 2.
- `email`: required, valid email, lowercase trim.
- `message`: required, trim, min length 5.
- `phone`, `business_name`, `service_interest`: optional trim.
- `source`: default `website_contact`.
- `segment`: default `pagina_contacto`.
- sanitize all string fields.

## Response JSON

### Success

```json
{
  "ok": true,
  "message": "Tu mensaje fue enviado correctamente.",
  "contact_id": "uuid-or-id",
  "lead_id": "uuid-or-id"
}
```

### Validation error

```json
{
  "ok": false,
  "message": "Datos invalidos."
}
```

### Server error

```json
{
  "ok": false,
  "message": "No se pudo procesar la solicitud."
}
```

Do not expose stack traces in public response.

## Business Logic Order

1. Validate payload.
2. Upsert contact by email.
3. Attach segment(s).
4. Create LeadBooster pending item.
5. Send internal email to `omarfisi@ideasestudiopr.com`.
6. Return response.

## Suggested LeadBooster payload

- `type`: `inbound_contact`
- `status`: `pending`
- `source`: `website_contact`
- `title`: `Nuevo lead desde Contacto`
- `priority`: `medium`
- `next_action`: `Enviar informacion o propuesta`
- `notes`: include `message` and useful metadata

## Error Handling Strategy

- Contact upsert failure: stop and return controlled error.
- Segment assignment failure: return controlled error (or partial depending on CRM policy).
- LeadBooster failure: keep contact stored, log error, return controlled status according to policy.
- Email failure: non-blocking recommended, keep contact + lead stored, log warning.

## FastAPI skeleton (reference)

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/public", tags=["public"])

class ContactSubmitIn(BaseModel):
    full_name: str = Field(min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    business_name: Optional[str] = None
    service_interest: Optional[str] = None
    message: str = Field(min_length=5)
    source: str = "website_contact"
    segment: str = "pagina_contacto"
    segments: Optional[List[str]] = None
    meta: Dict[str, Any] = {}

@router.post("/contact-submit")
async def contact_submit(payload: ContactSubmitIn):
    try:
        # 1) upsert contact
        # 2) segment attach
        # 3) leadbooster pending
        # 4) send email
        # return stable response
        return {
            "ok": True,
            "message": "Tu mensaje fue enviado correctamente.",
            "contact_id": "...",
            "lead_id": "..."
        }
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo procesar la solicitud.")
```

## Frontend integration status

The public website already sends this contract from `src/pages/ContactPage.jsx` through `submitPublicContactSubmission` in `src/lib/api.js`.
