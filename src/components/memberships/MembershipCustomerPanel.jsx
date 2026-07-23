import Button from "@/components/shared/Button.jsx";

const SUBMIT_LABELS = {
  idle: "Continuar al pago seguro",
  loading: "Preparando pago seguro…",
  error: "Continuar al pago seguro",
};

/**
 * Right-column panel — same fields/payload as before (email required, name
 * optional). No registration/login here yet; that's a later phase. Only
 * copy, labels, focus states and error presentation change in this pass.
 */
export default function MembershipCustomerPanel({
  customerEmail,
  customerName,
  onEmailChange,
  onNameChange,
  onSubmit,
  submitState,
}) {
  const isSubmitting = submitState.status === "loading";

  return (
    <form className="card-light membership-checkout-panel" onSubmit={onSubmit} noValidate>
      <p className="label-text mb-1" style={{ color: "var(--ideas-black)" }}>
        Tus datos
      </p>
      <p className="body-md membership-checkout-panel__hint">
        Usaremos este correo para confirmar tu membresía y enviarte el recibo de pago.
      </p>

      <label className="membership-checkout__field">
        <span>Correo electrónico *</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={customerEmail}
          onChange={(event) => onEmailChange(event.target.value)}
          disabled={isSubmitting}
          placeholder="tu@correo.com"
        />
      </label>

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

      <Button type="submit" disabled={isSubmitting} block aria-busy={isSubmitting}>
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
