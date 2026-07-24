import Button from "@/components/shared/Button.jsx";

const SUBMIT_LABELS = {
  idle: "Continuar al pago seguro",
  loading: "Preparando pago seguro…",
  error: "Continuar al pago seguro",
};

/**
 * Right-column panel — only renders once a Supabase session exists
 * (MembershipCheckoutPage gates that). No email field here anymore: the
 * account's email is shown once, in MembershipAuthenticatedAccount, and
 * MembershipCheckoutPage reads session.user.email directly when calling
 * createMembershipCheckoutSession — this panel never sees or edits it.
 *
 * Fase 3 — profileReady (from MembershipAuthenticatedAccount's own resolve
 * lifecycle) gates the submit button in addition to isSubmitting: checkout
 * must never fire before the authenticated user's CRM contact is actually
 * linked (POST /public/customer-profile/resolve succeeded).
 */
export default function MembershipCustomerPanel({ customerName, onNameChange, onSubmit, submitState, profileReady }) {
  const isSubmitting = submitState.status === "loading";
  const canSubmit = profileReady && !isSubmitting;

  return (
    <form className="card-light membership-checkout-panel" onSubmit={onSubmit} noValidate>
      <p className="label-text mb-1" style={{ color: "var(--ideas-black)" }}>
        Tus datos
      </p>
      <p className="body-md membership-checkout-panel__hint">
        Confirma tu nombre para personalizar el recibo de pago.
      </p>

      <label className="membership-checkout__field">
        <span>Nombre (opcional)</span>
        <input
          type="text"
          autoComplete="name"
          value={customerName}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={isSubmitting}
          placeholder="Tu nombre"
        />
      </label>

      <Button type="submit" disabled={!canSubmit} block aria-busy={isSubmitting}>
        {SUBMIT_LABELS[submitState.status] || SUBMIT_LABELS.idle}
      </Button>

      {submitState.status === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {submitState.message}
        </p>
      ) : null}
    </form>
  );
}
