from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from .exceptions import ContactSubmitError
from .schemas import ContactSubmitIn, ContactSubmitOut
from .service import ContactSubmitService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public", tags=["public"])


def get_contact_submit_service() -> ContactSubmitService:
    """
    Replace this dependency in your CRM backend container/wiring.
    """
    raise NotImplementedError("Wire get_contact_submit_service with your CRM services.")


@router.post(
    "/contact-submit",
    response_model=ContactSubmitOut,
    status_code=status.HTTP_200_OK,
)
async def submit_contact(
    payload: ContactSubmitIn,
    service: ContactSubmitService = Depends(get_contact_submit_service),
) -> ContactSubmitOut:
    try:
        return await service.handle(payload)
    except ContactSubmitError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"ok": False, "message": exc.message, "code": exc.code},
        ) from exc
    except Exception as exc:
        logger.exception("Unhandled error in contact-submit endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"ok": False, "message": "No se pudo procesar la solicitud."},
        ) from exc

