import { Link } from "react-router-dom";

export default function DecisionCard({
  title,
  description,
  to = "/contacto",
  cta = "Explorar",
  eyebrow,
}) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {eyebrow ? (
        <span className="mb-3 inline-flex rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {eyebrow}
        </span>
      ) : null}

      <h3 className="text-2xl font-semibold text-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-black/70">{description}</p>

      <div className="mt-6">
        <Link
          to={to}
          className="inline-flex items-center rounded-full bg-[#f1d146] px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}
