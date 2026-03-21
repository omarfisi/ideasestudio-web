export default function PageHero({
  eyebrow,
  title,
  subtitle,
  primaryAction = null,
  secondaryAction = null,
}) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}

        {(primaryAction || secondaryAction) && (
          <div className="page-hero__actions">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    </section>
  );
}
