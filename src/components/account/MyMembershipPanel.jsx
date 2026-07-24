import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import {
  cancelMyMembership,
  createBillingPortalSession,
  getMyMembership,
  reactivateMyMembership,
} from "@/lib/authenticatedApi.js";
import { classifyProfileError, translateProfileError } from "@/lib/membershipProfileErrors.js";
import MembershipActionConfirmModal from "@/components/account/MembershipActionConfirmModal.jsx";

// Temporarily hidden: "Administrar facturación" today only opens Stripe's
// externally-hosted Billing Portal (billing.stripe.com) — the same thing
// the Embedded Checkout migration is moving away from for the payment
// flow itself. Cancel/reactivate are already fully internal ("Mi
// membresía") and stay visible regardless of this flag. Flip this back to
// true once payment-method updates are handled internally (Stripe
// Elements/SetupIntent) instead of via the hosted portal — the backend
// endpoint (POST /public/my-membership/billing-portal) is untouched and
// keeps working; only this button's visibility changes.
const SHOW_BILLING_PORTAL_BUTTON = false;

const STATUS_LABELS = {
  trialing: "Periodo de prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  unpaid: "Pago no completado",
  incomplete: "Configuración pendiente",
  paused: "Pausada",
  incomplete_expired: "Checkout vencido",
  canceled: "Cancelada",
};

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es-PR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * "Mi membresía" — GET /public/my-membership. Renders only plan name,
 * status, billing interval, start date, next renewal and trial end: never
 * subscription_id, Stripe ids, contact_id or metadata_json, even though
 * the backend response happens to include subscription_id — this simply
 * never reads that field.
 *
 * can_cancel/can_reactivate/can_manage_billing always come from the
 * backend's own computation (see MyMembershipDetail) — this component
 * never re-derives button visibility from raw status/date fields itself.
 */
export default function MyMembershipPanel({ userId }) {
  const [state, setState] = useState({ status: "loading", membership: null, message: "", classified: null });
  const [confirmMode, setConfirmMode] = useState(null); // null | "cancel" | "reactivate"
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [portalPending, setPortalPending] = useState(false);
  const [portalError, setPortalError] = useState("");

  const load = useCallback(async () => {
    setState((prev) => ({ status: "loading", membership: prev.membership, message: "", classified: null }));
    try {
      const data = await getMyMembership();
      setState({ status: "ready", membership: data?.membership || null, message: "", classified: null });
    } catch (error) {
      setState({
        status: "error",
        membership: null,
        message: translateProfileError(error),
        classified: classifyProfileError(error),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cancelled) return;
      await load();
    }
    if (userId) run();
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  function openCancelConfirm() {
    setActionError("");
    setNoticeMessage("");
    setConfirmMode("cancel");
  }

  function openReactivateConfirm() {
    setActionError("");
    setNoticeMessage("");
    setConfirmMode("reactivate");
  }

  function closeConfirm() {
    if (actionPending) return;
    setConfirmMode(null);
    setActionError("");
  }

  async function confirmCancel() {
    setActionPending(true);
    setActionError("");
    try {
      const result = await cancelMyMembership();
      setConfirmMode(null);
      setNoticeMessage(result?.membership?.message || "Tu membresía se cancelará al final del periodo actual.");
      await load();
    } catch (error) {
      setActionError(translateProfileError(error));
    } finally {
      setActionPending(false);
    }
  }

  async function confirmReactivate() {
    setActionPending(true);
    setActionError("");
    try {
      const result = await reactivateMyMembership();
      setConfirmMode(null);
      setNoticeMessage(result?.membership?.message || "Tu membresía continuará renovándose normalmente.");
      await load();
    } catch (error) {
      setActionError(translateProfileError(error));
    } finally {
      setActionPending(false);
    }
  }

  async function handleBillingPortal() {
    if (portalPending) return;
    setPortalPending(true);
    setPortalError("");
    try {
      const result = await createBillingPortalSession();
      if (result?.portal_url) {
        window.location.assign(result.portal_url);
        return;
      }
      setPortalError("No pudimos abrir el portal de facturación. Intenta nuevamente.");
      setPortalPending(false);
    } catch (error) {
      setPortalError(translateProfileError(error));
      setPortalPending(false);
    }
  }

  if (state.status === "loading" && !state.membership) {
    return <div className="account-loading">Cargando tu membresía…</div>;
  }

  if (state.status === "error") {
    if (state.classified === "auth_required") {
      return (
        <div className="account-empty-state">
          <h3>Tu sesión expiró</h3>
          <p>{state.message}</p>
          <Link to="/mi-cuenta/login">Iniciar sesión</Link>
        </div>
      );
    }
    return (
      <div className="account-empty-state">
        <h3>No pudimos cargar tu membresía</h3>
        <p>{state.message}</p>
      </div>
    );
  }

  const membership = state.membership;

  if (!membership) {
    return (
      <div className="account-empty-state">
        <h3>No tienes una membresía activa.</h3>
        <p>Explora nuestros planes en el catálogo de servicios.</p>
      </div>
    );
  }

  const startDate = formatDate(membership.created_at);
  const nextRenewal = formatDate(membership.current_period_end);
  const trialEnd = formatDate(membership.trial_end);
  const anyActionPending = actionPending || portalPending;

  return (
    <div className="account-membership-card">
      <div className="account-membership-header">
        <div>
          <p>Plan</p>
          <strong>{membership.plan_name}</strong>
        </div>
        <div>
          <p>Estado</p>
          <strong className={`status-membership status-membership--${membership.status}`}>
            {STATUS_LABELS[membership.status] || membership.status}
          </strong>
        </div>
      </div>

      <div className="account-membership-details">
        <div>
          <p>Facturación</p>
          <strong>{membership.billing_interval === "year" ? "Anual" : "Mensual"}</strong>
        </div>
        {startDate ? (
          <div>
            <p>Fecha de inicio</p>
            <strong>{startDate}</strong>
          </div>
        ) : null}
        {nextRenewal ? (
          <div>
            <p>Próxima renovación</p>
            <strong>{nextRenewal}</strong>
          </div>
        ) : null}
        {trialEnd ? (
          <div>
            <p>Fin de prueba</p>
            <strong>{trialEnd}</strong>
          </div>
        ) : null}
      </div>

      {membership.cancel_at_period_end ? (
        <p className="account-membership-notice">Se cancelará al final del periodo actual.</p>
      ) : null}

      {noticeMessage ? (
        <p className="account-membership-notice" role="status">
          {noticeMessage}
        </p>
      ) : null}

      {portalError ? (
        <p className="account-membership-notice account-membership-notice--error" role="alert">
          {portalError}
        </p>
      ) : null}

      {membership.can_cancel || membership.can_reactivate || (membership.can_manage_billing && SHOW_BILLING_PORTAL_BUTTON) ? (
        <div className="account-membership-actions">
          {membership.can_cancel ? (
            <button type="button" onClick={openCancelConfirm} disabled={anyActionPending}>
              Cancelar membresía
            </button>
          ) : null}
          {membership.can_reactivate ? (
            <button type="button" onClick={openReactivateConfirm} disabled={anyActionPending}>
              Reactivar membresía
            </button>
          ) : null}
          {membership.can_manage_billing && SHOW_BILLING_PORTAL_BUTTON ? (
            <button type="button" onClick={handleBillingPortal} disabled={anyActionPending}>
              {portalPending ? "Abriendo portal…" : "Administrar facturación"}
            </button>
          ) : null}
        </div>
      ) : null}

      <MembershipActionConfirmModal
        open={confirmMode === "cancel"}
        title="¿Cancelar tu membresía?"
        description="Tu membresía seguirá activa hasta el final del periodo ya pagado. No se te cobrará de nuevo después de esa fecha."
        confirmLabel="Sí, cancelar al final del periodo"
        pending={actionPending}
        error={actionError}
        onConfirm={confirmCancel}
        onClose={closeConfirm}
      />

      <MembershipActionConfirmModal
        open={confirmMode === "reactivate"}
        title="¿Reactivar tu membresía?"
        description="Tu membresía continuará renovándose automáticamente al final de cada periodo."
        confirmLabel="Sí, reactivar"
        pending={actionPending}
        error={actionError}
        onConfirm={confirmReactivate}
        onClose={closeConfirm}
      />
    </div>
  );
}
