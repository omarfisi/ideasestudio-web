from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class ContactSubmitIn(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=180)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=60)
    business_name: str | None = Field(default=None, max_length=180)
    service_interest: str | None = Field(default=None, max_length=180)
    message: str = Field(..., min_length=5, max_length=5000)
    source: str = Field(default="website_contact", max_length=80)
    segment: str = Field(default="pagina_contacto", max_length=120)
    segments: list[str] | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ContactSubmitOut(BaseModel):
    ok: bool = True
    message: str
    contact_id: str
    lead_id: str | None = None
    warnings: list[str] = Field(default_factory=list)

