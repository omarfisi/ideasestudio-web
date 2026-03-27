import { Link } from "react-router-dom";
import QulandHeroShell, { QulandArrowIcon } from "@/components/shared/QulandHeroShell.jsx";

const FLOATING_TAG_CLASSES = [
  "quland-hero__tag--top-left",
  "quland-hero__tag--top-right",
  "quland-hero__tag--mid-left",
  "quland-hero__tag--mid-right",
];

function getSideLabels(niche) {
  const heroTags = niche.heroTags || [];
  const orientation = niche.orientation || {};

  const leftFallback = [heroTags[0], orientation.outcomeLabel].filter(Boolean).slice(0, 2);
  const rightFallback = [heroTags[1], orientation.audienceTitle].filter(Boolean).slice(0, 2);

  return {
    left: (niche.heroSideLabels?.left || leftFallback).slice(0, 2),
    right: (niche.heroSideLabels?.right || rightFallback).slice(0, 2),
  };
}

function getFloatingTags(niche) {
  const { left, right } = getSideLabels(niche);
  const orderedLabels = [left[0], right[0], left[1], right[1]].filter(Boolean);

  return orderedLabels.map((label, index) => ({
    label,
    className: FLOATING_TAG_CLASSES[index],
  }));
}

export default function ServiceNicheHero({ niche }) {
  const heroTags = niche.heroTags || [];
  const floatingTags = getFloatingTags(niche);

  return (
    <QulandHeroShell
      sectionId={`${niche.slug}-hero`}
      className="quland-hero--service"
      heading={
        <h1 className="quland-hero__title">
          <span>{niche.heroTitle}</span>
        </h1>
      }
      subtitle={niche.heroSubtitle}
      meta={
        heroTags.length ? (
          <div className="quland-hero__meta-tags">
            {heroTags.map((item) => (
              <span key={item} className="quland-hero__meta-tag">
                {item}
              </span>
            ))}
          </div>
        ) : null
      }
      actions={
        <>
          <a href="#rutas-principales" className="quland-hero__button quland-hero__button--primary">
            <span>{niche.heroPrimaryLabel || "Ver rutas principales"}</span>
            <QulandArrowIcon />
          </a>

          <Link
            to={`/contacto?mode=proposal&niche=${niche.slug}`}
            className="quland-hero__button quland-hero__button--link"
          >
            <span>{niche.heroSecondaryLabel || "Compartir mi idea"}</span>
            <QulandArrowIcon />
          </Link>
        </>
      }
      floatingTags={floatingTags}
    />
  );
}
