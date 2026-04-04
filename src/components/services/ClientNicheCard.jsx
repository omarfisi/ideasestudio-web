import { Link } from "react-router-dom";

function ClientNicheRating({ rating, reviews }) {
  if (typeof rating !== "number") {
    return null;
  }

  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="client-niche-card__rating" aria-label={`Puntuación de ${safeRating} sobre 5`}>
      <span className="client-niche-card__stars" aria-hidden="true">
        {"★".repeat(safeRating)}
        {"☆".repeat(5 - safeRating)}
      </span>
      {typeof reviews === "number" ? (
        <span className="client-niche-card__reviews">({reviews})</span>
      ) : null}
    </div>
  );
}

function formatNicheNumber(id) {
  if (typeof id !== "number" || Number.isNaN(id)) {
    return null;
  }

  return String(id).padStart(2, "0");
}

function ClientNicheCardBody({ niche }) {
  const number = formatNicheNumber(niche.id);

  return (
    <>
      <div className="client-niche-card__number">{number}</div>

      <div className="client-niche-card__content">
        <h3>{niche.title}</h3>
        <p>{niche.description}</p>

        <ClientNicheRating rating={niche.rating} reviews={niche.reviews} />

        {Array.isArray(niche.services) && niche.services.length ? (
          <ul className="client-niche-card__services">
            {niche.services.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {niche.ctaLabel ? (
          <span className="client-niche-card__cta">
            <span>{niche.ctaLabel}</span>
            <span className="client-niche-card__cta-icon" aria-hidden="true">
              ↗
            </span>
          </span>
        ) : null}
      </div>
    </>
  );
}

export default function ClientNicheCard({ niche }) {
  const classes = ["client-niche-card", niche.to ? "is-interactive" : ""]
    .filter(Boolean)
    .join(" ");

  if (niche.to) {
    return (
      <Link to={niche.to} className={classes}>
        <ClientNicheCardBody niche={niche} />
      </Link>
    );
  }

  return (
    <article className={classes}>
      <ClientNicheCardBody niche={niche} />
    </article>
  );
}
