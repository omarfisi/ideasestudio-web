from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any, Protocol, TypedDict

from .exceptions import ContactSubmitError
from .schemas import ContactSubmitIn, ContactSubmitOut


class ContactRecord(TypedDict, total=False):
    id: str | int
    full_name: str | None
    email: str | None
    phone: str | None
    business_name: str | None
    service_interest: str | None
    source: str | None
    meta: dict[str, Any] | None


class ContactRepository(Protocol):
    async def get_by_email(self, email: str) -> ContactRecord | None: ...

    async def create(self, data: dict[str, Any]) -> ContactRecord: ...

    async def update(self, contact_id: str | int, data: dict[str, Any]) -> ContactRecord: ...


class SegmentService(Protocol):
    async def ensure_contact_segments(self, contact_id: str | int, segments: list[str]) -> None: ...


class LeadBoosterService(Protocol):
    async def create_pending(
        self,
        *,
        contact_id: str | int,
        title: str,
        source: str,
        notes: str,
        next_action: str,
        priority: str,
        extra: dict[str, Any],
    ) -> str | int: ...


class EmailService(Protocol):
    async def send_internal_contact_notification(
        self,
        *,
        to_email: str,
        subject: str,
        payload: dict[str, Any],
    ) -> None: ...


class LoggerLike(Protocol):
    def info(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def warning(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def error(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def exception(self, msg: str, *args: Any, **kwargs: Any) -> None: ...


@dataclass(slots=True)
class ContactSubmitService:
    contacts: ContactRepository
    segments: SegmentService
    leadbooster: LeadBoosterService
    email: EmailService
    logger: LoggerLike
    internal_notification_email: str = "omarfisi@ideasestudiopr.com"

    async def handle(self, payload: ContactSubmitIn) -> ContactSubmitOut:
        normalized = self._normalize_payload(payload)

        contact = await self._upsert_contact(normalized)
        contact_id = contact.get("id")
        if not contact_id:
            raise ContactSubmitError("No se pudo procesar la solicitud.", code="missing_contact_id")

        try:
            await self.segments.ensure_contact_segments(contact_id, normalized["segments"])
            self.logger.info(
                "contact-submit segment assignment ok",
                extra={"contact_id": str(contact_id), "segments": normalized["segments"]},
            )
        except Exception as exc:
            self.logger.exception(
                "contact-submit segment assignment failed",
                extra={"contact_id": str(contact_id), "segments": normalized["segments"], "error": str(exc)},
            )
            raise ContactSubmitError("No se pudo procesar la solicitud.", code="segment_assignment_failed") from exc

        lead_id: str | None = None
        warnings: list[str] = []

        try:
            lead_id = str(
                await self.leadbooster.create_pending(
                    contact_id=contact_id,
                    title="Nuevo lead desde Contacto",
                    source=normalized["source"],
                    notes=self._build_lead_notes(normalized),
                    next_action="Enviar informacion o propuesta",
                    priority="medium",
                    extra={
                        "type": "inbound_contact",
                        "status": "pending",
                        "service_interest": normalized["service_interest"],
                        "submitted_at": normalized["submitted_at"],
                        "meta": normalized["meta"],
                    },
                )
            )
            self.logger.info(
                "contact-submit leadbooster pending created",
                extra={"contact_id": str(contact_id), "lead_id": lead_id},
            )
        except Exception as exc:
            warnings.append("leadbooster_pending_failed")
            self.logger.exception(
                "contact-submit leadbooster pending failed",
                extra={"contact_id": str(contact_id), "error": str(exc)},
            )

        try:
            await self.email.send_internal_contact_notification(
                to_email=self.internal_notification_email,
                subject="Nuevo contacto desde la pagina web",
                payload={
                    "full_name": normalized["full_name"],
                    "email": normalized["email"],
                    "phone": normalized["phone"],
                    "business_name": normalized["business_name"],
                    "service_interest": normalized["service_interest"],
                    "message": normalized["message"],
                    "source": normalized["source"],
                    "segments": normalized["segments"],
                    "submitted_at": normalized["submitted_at"],
                    "contact_id": str(contact_id),
                    "lead_id": lead_id,
                    "meta": normalized["meta"],
                },
            )
            self.logger.info(
                "contact-submit internal email sent",
                extra={"contact_id": str(contact_id), "lead_id": lead_id},
            )
        except Exception as exc:
            warnings.append("internal_email_failed")
            self.logger.exception(
                "contact-submit internal email failed",
                extra={"contact_id": str(contact_id), "error": str(exc)},
            )

        message = (
            "Tu mensaje fue enviado correctamente."
            if not warnings
            else "Tu mensaje fue recibido. Algunas acciones internas quedaron pendientes."
        )

        return ContactSubmitOut(
            ok=True,
            message=message,
            contact_id=str(contact_id),
            lead_id=lead_id,
            warnings=warnings,
        )

    async def _upsert_contact(self, normalized: dict[str, Any]) -> ContactRecord:
        email = normalized["email"]
        try:
            existing = await self.contacts.get_by_email(email)
        except Exception as exc:
            self.logger.exception(
                "contact-submit contact lookup failed",
                extra={"email": email, "error": str(exc)},
            )
            raise ContactSubmitError("No se pudo procesar la solicitud.", code="contact_lookup_failed") from exc

        if existing:
            data = self._build_update_data(existing, normalized)
            if data:
                try:
                    updated = await self.contacts.update(existing["id"], data)
                except Exception as exc:
                    self.logger.exception(
                        "contact-submit contact update failed",
                        extra={"contact_id": str(existing.get("id")), "error": str(exc)},
                    )
                    raise ContactSubmitError("No se pudo procesar la solicitud.", code="contact_update_failed") from exc
                self.logger.info(
                    "contact-submit contact updated",
                    extra={"contact_id": str(updated.get("id"))},
                )
                return updated

            self.logger.info(
                "contact-submit contact reused with no changes",
                extra={"contact_id": str(existing.get("id"))},
            )
            return existing

        create_data = {
            "full_name": normalized["full_name"],
            "email": normalized["email"],
            "phone": normalized["phone"],
            "business_name": normalized["business_name"],
            "service_interest": normalized["service_interest"],
            "source": normalized["source"],
            "meta": {
                "first_contact_channel": "website_contact",
                "created_from_endpoint": "api/public/contact-submit",
                **normalized["meta"],
            },
        }

        try:
            created = await self.contacts.create(create_data)
        except Exception as exc:
            self.logger.exception(
                "contact-submit contact create failed",
                extra={"email": email, "error": str(exc)},
            )
            raise ContactSubmitError("No se pudo procesar la solicitud.", code="contact_create_failed") from exc

        self.logger.info(
            "contact-submit contact created",
            extra={"contact_id": str(created.get("id")), "email": email},
        )
        return created

    def _build_update_data(self, existing: ContactRecord, normalized: dict[str, Any]) -> dict[str, Any]:
        update: dict[str, Any] = {}

        for key in ("full_name", "phone", "business_name", "service_interest"):
            current = self._clean(existing.get(key))
            incoming = self._clean(normalized.get(key))

            if incoming and current != incoming:
                update[key] = incoming

        existing_meta = existing.get("meta") if isinstance(existing.get("meta"), dict) else {}
        update["meta"] = {**existing_meta, **normalized["meta"]}

        if not update["meta"]:
            update.pop("meta", None)

        return update

    def _normalize_payload(self, payload: ContactSubmitIn) -> dict[str, Any]:
        submitted_at = payload.meta.get("submitted_at") if isinstance(payload.meta, dict) else None
        if not submitted_at:
            submitted_at = datetime.now(UTC).isoformat()

        segment_values = [payload.segment, *(payload.segments or [])]
        normalized_segments = self._normalize_segments(segment_values)

        full_name = self._clean(payload.full_name)
        email = self._clean(str(payload.email)).lower()
        message = self._clean(payload.message)

        if len(full_name) < 2 or len(message) < 5 or not email:
            raise ContactSubmitError("Datos invalidos.", status_code=400, code="invalid_payload")

        return {
            "full_name": full_name,
            "email": email,
            "phone": self._clean(payload.phone) or None,
            "business_name": self._clean(payload.business_name) or None,
            "service_interest": self._clean(payload.service_interest) or None,
            "message": message,
            "source": self._normalize_segment_or_source(payload.source) or "website_contact",
            "segments": normalized_segments,
            "meta": payload.meta if isinstance(payload.meta, dict) else {},
            "submitted_at": submitted_at,
        }

    def _normalize_segments(self, values: list[str | None]) -> list[str]:
        seen: set[str] = set()
        ordered: list[str] = []

        for value in values:
            token = self._normalize_segment_or_source(value)
            if not token:
                continue
            if token not in seen:
                seen.add(token)
                ordered.append(token)

        if not ordered:
            ordered.append("pagina_contacto")

        return ordered

    def _normalize_segment_or_source(self, value: str | None) -> str:
        raw = self._clean(value).lower()
        raw = re.sub(r"\s+", "_", raw)
        raw = re.sub(r"[^a-z0-9_]+", "_", raw)
        return raw.strip("_")

    def _build_lead_notes(self, normalized: dict[str, Any]) -> str:
        blocks = [
            "Nuevo contacto recibido desde la pagina de contacto.",
            f"Nombre: {normalized['full_name']}",
            f"Email: {normalized['email']}",
            f"Telefono: {normalized['phone'] or '-'}",
            f"Negocio: {normalized['business_name'] or '-'}",
            f"Servicio de interes: {normalized['service_interest'] or '-'}",
            f"Segmentos: {', '.join(normalized['segments'])}",
            f"Mensaje:\n{normalized['message']}",
        ]
        return "\n".join(blocks)

    @staticmethod
    def _clean(value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()

