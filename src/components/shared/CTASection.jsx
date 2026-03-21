import Button from "@/components/shared/Button.jsx";

export default function CTASection({
  title,
  text,
  primaryLabel = "Solicitar propuesta",
  primaryTo = "/contacto",
  secondaryLabel = "Ver servicios",
  secondaryTo = "/servicios",
}) {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-box">
          <div>
            <span className="eyebrow">Listo para crecer</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>

          <div className="cta-box__actions">
            <Button to={primaryTo}>{primaryLabel}</Button>
            <Button to={secondaryTo} variant="secondary">
              {secondaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
