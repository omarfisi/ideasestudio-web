import { Link } from "react-router-dom";

const FALLBACK_CTA_LABEL = "Solicitar información";
const FALLBACK_CTA_URL = "/contacto";

function formatPrice(price, currency) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "";
  const formatted = amount.toLocaleString("es-PR", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency === "USD" ? "$" : ""}${formatted}`;
}

function PlanCard({ plan }) {
  const featured = Boolean(plan.is_featured);
  const features = Array.isArray(plan.features_json) ? plan.features_json : [];
  const services = Array.isArray(plan.services) ? plan.services : [];
  const includedService = plan.included_service || null;
  const ctaLabel = plan.cta_label || FALLBACK_CTA_LABEL;
  const ctaUrl = plan.cta_url || FALLBACK_CTA_URL;
  const isExternal = /^https?:\/\//i.test(ctaUrl);

  return (
    <article
      className="card-light flex h-full flex-col"
      style={
        featured
          ? { border: "2px solid var(--ideas-yellow)", boxShadow: "0 14px 34px rgba(249, 208, 1, 0.22)" }
          : undefined
      }
    >
      <div className="mb-4 flex min-h-[28px] items-center gap-2">
        {plan.badge_text ? <span className="eyebrow-yellow">{plan.badge_text}</span> : null}
        {featured && !plan.badge_text ? <span className="eyebrow-yellow">Más popular</span> : null}
      </div>

      <h3
        className="mb-2"
        style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.03em", color: "var(--ideas-black)" }}
      >
        {plan.name}
      </h3>

      {plan.description ? <p className="body-md mb-4">{plan.description}</p> : null}

      <div className="mb-4 flex items-baseline gap-1">
        <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 900, fontSize: "36px", color: "var(--ideas-black)" }}>
          {formatPrice(plan.price, plan.currency)}
        </span>
        <span className="body-md" style={{ color: "rgba(11,11,13,0.6)" }}>
          /mes
        </span>
      </div>

      {plan.trial_period_days > 0 ? (
        <p className="label-text mb-4" style={{ color: "var(--ideas-black)" }}>
          {plan.trial_period_days} días de prueba
        </p>
      ) : null}

      {includedService ? (
        <p
          className="label-text mb-4 rounded-lg px-3 py-2"
          style={{ color: "var(--ideas-black)", backgroundColor: "rgba(249, 208, 1, 0.14)" }}
        >
          Incluye: {includedService.label}
        </p>
      ) : null}

      <div className="mb-6 flex-1">
        {features.length > 0 ? (
          <ul className="list-ideas">
            {features.map((feature) => (
              <li key={feature.key || feature.label}>
                {feature.label}
                {feature.quantity != null ? ` (${feature.quantity}${feature.period ? `/${feature.period}` : ""})` : ""}
              </li>
            ))}
          </ul>
        ) : null}

        {services.length > 0 ? (
          <div className={features.length > 0 ? "mt-5" : undefined}>
            <p className="label-text mb-2" style={{ color: "var(--ideas-black)" }}>
              Servicios incluidos
            </p>
            <ul className="list-ideas">
              {services.map((service) => (
                <li key={service.id} className="flex items-center gap-2">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt=""
                      className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : null}
                  {service.is_featured ? <strong>{service.label}</strong> : <span>{service.label}</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {isExternal ? (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noreferrer"
          className="button-text inline-flex items-center justify-center rounded-full px-6 py-3 text-center transition"
          style={{ backgroundColor: "var(--ideas-yellow)", color: "var(--ideas-black)" }}
          aria-label={`${ctaLabel} — ${plan.name}`}
        >
          {ctaLabel}
        </a>
      ) : (
        <Link
          to={ctaUrl}
          className="button-text inline-flex items-center justify-center rounded-full px-6 py-3 text-center transition"
          style={{ backgroundColor: "var(--ideas-yellow)", color: "var(--ideas-black)" }}
          aria-label={`${ctaLabel} — ${plan.name}`}
        >
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}

export function PlanCardSkeleton() {
  return (
    <div className="card-light" aria-hidden="true">
      <div className="mb-4 h-6 w-24 animate-pulse rounded-full bg-black/10" />
      <div className="mb-3 h-6 w-2/3 animate-pulse rounded bg-black/10" />
      <div className="mb-6 h-4 w-full animate-pulse rounded bg-black/10" />
      <div className="mb-6 h-10 w-1/2 animate-pulse rounded bg-black/10" />
      <div className="h-12 w-full animate-pulse rounded-full bg-black/10" />
    </div>
  );
}

function planCardsGridClass(count) {
  if (count === 1) return "grid-cols-1 max-w-md mx-auto";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

/**
 * Pure presentational grid of plan cards. Receives `plans` by props, does
 * not fetch, does not depend on a route or the general catalog — the
 * caller (MembershipPlansSection for the full catalog,
 * ServiceMembershipPlansModal for a single service) owns loading/error/
 * empty state and data-fetching.
 */
export default function MembershipPlanCards({ plans }) {
  const items = Array.isArray(plans) ? plans : [];
  return (
    <div className={`grid gap-6 ${planCardsGridClass(items.length)}`}>
      {items.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
