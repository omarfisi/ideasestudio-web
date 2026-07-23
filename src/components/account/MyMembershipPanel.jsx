import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyMembership } from "@/lib/authenticatedApi.js";
import { classifyProfileError, translateProfileError } from "@/lib/membershipProfileErrors.js";

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
 */
export default function MyMembershipPanel({ userId }) {
  const [state, setState] = useState({ status: "loading", membership: null, message: "", classified: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading", membership: null, message: "", classified: null });
      try {
        const data = await getMyMembership();
        if (cancelled) return;
        setState({ status: "ready", membership: data?.membership || null, message: "", classified: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          membership: null,
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

  if (state.status === "loading") {
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
    </div>
  );
}
