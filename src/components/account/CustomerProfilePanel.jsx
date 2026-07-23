import { useEffect, useState } from "react";
import { getCustomerProfile, updateCustomerProfile } from "@/lib/authenticatedApi.js";
import { classifyProfileError, translateProfileError } from "@/lib/membershipProfileErrors.js";

const NAME_MAX_LENGTH = 200;
const PHONE_MAX_LENGTH = 50;

/**
 * "Datos personales" — GET/PATCH /public/customer-profile/me. Email is
 * always shown, never editable (not even declared in the PATCH payload).
 * Only a real, non-empty, changed value for name/phone is ever included
 * in the PATCH body — an unchanged or blank field is simply omitted,
 * never sent as "" (the backend rejects an empty string with 422 by
 * design; this mirrors that instead of relying on the round-trip to catch it).
 */
export default function CustomerProfilePanel({ userId, email }) {
  const [loadState, setLoadState] = useState({ status: "loading", message: "", classified: null });
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saveState, setSaveState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState({ status: "loading", message: "", classified: null });
      try {
        const data = await getCustomerProfile();
        if (cancelled) return;
        setProfile(data);
        setName(data?.name || "");
        setPhone(data?.phone || "");
        setLoadState({ status: "ready", message: "", classified: null });
      } catch (error) {
        if (cancelled) return;
        setLoadState({
          status: "error",
          message: translateProfileError(error),
          classified: classifyProfileError(error),
        });
      }
    }

    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const nameChanged = Boolean(trimmedName) && trimmedName !== (profile?.name || "");
  const phoneChanged = Boolean(trimmedPhone) && trimmedPhone !== (profile?.phone || "");
  const hasChanges = nameChanged || phoneChanged;
  const nameTooLong = trimmedName.length > NAME_MAX_LENGTH;
  const phoneTooLong = trimmedPhone.length > PHONE_MAX_LENGTH;
  const isSaving = saveState.status === "saving";
  const canSave = hasChanges && !nameTooLong && !phoneTooLong && !isSaving;

  async function handleSave(event) {
    event.preventDefault();
    if (!canSave) return;

    setSaveState({ status: "saving", message: "" });
    const payload = {};
    if (nameChanged) payload.name = trimmedName;
    if (phoneChanged) payload.phone = trimmedPhone;

    try {
      const updated = await updateCustomerProfile(payload);
      setProfile(updated);
      setName(updated?.name || "");
      setPhone(updated?.phone || "");
      setSaveState({ status: "saved", message: "Perfil actualizado." });
    } catch (error) {
      setSaveState({ status: "error", message: translateProfileError(error) });
    }
  }

  if (loadState.status === "loading") {
    return <div className="account-loading">Cargando tu perfil…</div>;
  }

  if (loadState.status === "error") {
    return (
      <div className="account-empty-state">
        <h3>No pudimos cargar tu perfil</h3>
        <p>{loadState.message}</p>
      </div>
    );
  }

  return (
    <form className="account-profile-form" onSubmit={handleSave} noValidate>
      <label className="account-field">
        <span>Correo</span>
        <input type="email" value={email || ""} disabled readOnly />
      </label>

      <label className="account-field">
        <span>Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaveState({ status: "idle", message: "" });
          }}
          disabled={isSaving}
        />
      </label>
      {nameTooLong ? (
        <p className="form-status form-status--error">El nombre no puede superar los 200 caracteres.</p>
      ) : null}

      <label className="account-field">
        <span>Teléfono</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setSaveState({ status: "idle", message: "" });
          }}
          disabled={isSaving}
        />
      </label>
      {phoneTooLong ? (
        <p className="form-status form-status--error">El teléfono no puede superar los 50 caracteres.</p>
      ) : null}

      {saveState.status === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {saveState.message}
        </p>
      ) : null}
      {saveState.status === "saved" ? (
        <p className="form-status form-status--success" role="status">
          {saveState.message}
        </p>
      ) : null}

      <button type="submit" className="account-profile-save" disabled={!canSave} aria-busy={isSaving}>
        {isSaving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
