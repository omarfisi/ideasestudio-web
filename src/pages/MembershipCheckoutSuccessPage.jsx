import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { getMembershipCheckoutSessionStatus } from "@/lib/api.js";
import { clearMembershipCheckoutSelection } from "@/lib/membershipCheckoutSession.js";

const STATUS_LABELS = {
  incomplete: "Pendiente de confirmación",
  incomplete_expired: "Sesión expirada",
  trialing: "En período de prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  unpaid: "Sin pagar",
  canceled: "Cancelada",
  paused: "Pausada",
};

// A brand-new Embedded Checkout completion typically lands here before
// Stripe's webhook has finished updating customer_subscriptions — status
// still reads "incomplete" for a moment. Poll a bounded number of times
// rather than showing a stale/uncertain answer; give up gracefully (never
// spin forever) if the webhook still hasn't caught up.
const MAX_POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 2500;

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-PR", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * /membresias/checkout/exito — never trusts session_id from the URL by
 * itself (Stripe's redirect could in principle be spoofed/replayed):
 * always re-queries our own backend, which reads the persisted
 * customer_subscriptions row (kept in sync by the Stripe webhook), not
 * the query param. Never shows a confirmed/active state until the
 * backend itself reports a status other than "incomplete" — see the
 * poll loop below. The stored plan/service selection (sessionStorage) is
 * cleared only once that definitive answer arrives, never earlier.
 */
export default function MembershipCheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState(sessionId ? "loading" : "missing_session");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    let timeoutId;

    async function poll(attemptNumber) {
      try {
        const data = await getMembershipCheckoutSessionStatus(sessionId);
        if (cancelled) return;

        if (data.status === "incomplete") {
          setResult(data);
          if (attemptNumber >= MAX_POLL_ATTEMPTS) {
            setStatus("processing_timeout");
            return;
          }
          setStatus("processing");
          timeoutId = setTimeout(() => poll(attemptNumber + 1), POLL_INTERVAL_MS);
          return;
        }

        // A definitive answer from the webhook (active/trialing/past_due/
        // canceled/etc — anything but "incomplete"): the stored selection
        // has done its job, and a later, separate checkout attempt must
        // start clean rather than resuming this one.
        clearMembershipCheckoutSelection();
        setResult(data);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    }

    setStatus("loading");
    poll(0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId]);

  const effectiveStatus = sessionId ? status : "missing_session";

  if (effectiveStatus === "missing_session" || effectiveStatus === "error") {
    return (
      <>
        <PageHero
          eyebrow="Membresías"
          title="No pudimos confirmar tu suscripción"
          subtitle="Si ya completaste el pago, revisa tu correo — recibirás la confirmación en unos minutos."
        />
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (effectiveStatus === "processing_timeout") {
    return (
      <>
        <PageHero
          eyebrow="Membresías"
          title="Tu pago sigue en proceso"
          subtitle="Esto puede tardar unos minutos más. Te avisaremos por correo en cuanto se confirme, o revisa el estado en tu cuenta."
        />
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Button to="/mi-cuenta">Ir a mi cuenta</Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (effectiveStatus === "loading" || effectiveStatus === "processing") {
    return (
      <>
        <PageHero eyebrow="Membresías" title="Confirmando tu suscripción…" />
        <section className="section">
          <div className="container">
            <p className="body-md">Un momento…</p>
          </div>
        </section>
      </>
    );
  }

  const { status: subscriptionStatus, plan, service, trial_end: trialEnd, current_period_end: currentPeriodEnd } = result;
  const trialEndLabel = formatDate(trialEnd);
  const nextBillingLabel = formatDate(currentPeriodEnd);

  return (
    <>
      <PageHero eyebrow="Membresías" title="¡Listo! Tu membresía está en proceso" />

      <section className="section">
        <div className="container">
          <div className="card-light membership-checkout__summary" style={{ maxWidth: "560px" }}>
            <p className="label-text" style={{ color: "rgba(11,11,13,0.6)" }}>
              Plan
            </p>
            <p className="body-md" style={{ fontWeight: 700, fontSize: "20px" }}>
              {plan.name}
            </p>

            <p className="label-text mt-3" style={{ color: "rgba(11,11,13,0.6)" }}>
              Servicio
            </p>
            <p className="body-md">{service.name}</p>

            <p className="label-text mt-3" style={{ color: "rgba(11,11,13,0.6)" }}>
              Estado
            </p>
            <p className="body-md">{STATUS_LABELS[subscriptionStatus] || subscriptionStatus}</p>

            {trialEndLabel ? (
              <p className="label-text mt-3">Tu período de prueba termina el {trialEndLabel}.</p>
            ) : null}
            {!trialEndLabel && nextBillingLabel ? (
              <p className="label-text mt-3">Próxima fecha de cobro: {nextBillingLabel}.</p>
            ) : null}

            <div className="mt-6">
              <Button to="/mi-cuenta">Ir a mi cuenta</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
