# FastAPI Contact Submit Bundle

This folder contains a production-oriented template for the CRM backend endpoint:

- `router.py`: FastAPI route (`POST /api/public/contact-submit`)
- `schemas.py`: request/response models
- `service.py`: orchestration logic (upsert contact, segment attach, LeadBooster pending, internal email)
- `exceptions.py`: controlled domain error type

## Integration Steps

1. Copy these files into your CRM backend package (for example `app/routers`, `app/services`, `app/schemas`).
2. Wire `get_contact_submit_service()` in `router.py` using your real dependencies:
   - contacts repository
   - segment service
   - leadbooster service
   - email service
   - logger
3. Include the router in your FastAPI app.
4. Make sure CORS allows your public web domain.

## Minimal Wiring Example

```python
from fastapi import FastAPI
from app.public_contact.router import router as public_contact_router

app = FastAPI()
app.include_router(public_contact_router)
```

Example dependency override:

```python
from app.public_contact.router import get_contact_submit_service
from app.public_contact.service import ContactSubmitService

def build_contact_submit_service() -> ContactSubmitService:
    return ContactSubmitService(
        contacts=contacts_repo,
        segments=segments_service,
        leadbooster=leadbooster_service,
        email=email_service,
        logger=logger,
        internal_notification_email="omarfisi@ideasestudiopr.com",
    )

app.dependency_overrides[get_contact_submit_service] = build_contact_submit_service
```

## Behavior

- Critical failures: contact lookup/create/update, segment assignment.
- Non-blocking failures: leadbooster pending creation and email notification.
- Public response never leaks traceback.
- Success response shape stays stable:

```json
{
  "ok": true,
  "message": "Tu mensaje fue enviado correctamente.",
  "contact_id": "123",
  "lead_id": "456",
  "warnings": []
}
```

