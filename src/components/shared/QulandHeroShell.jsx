import heroMainImage from "../../../quland-template/client/assets/images/home-one-hero-main.webp";
import heroCircleShadow from "../../../quland-template/client/assets/images/home-one-hero-circle-shadow.svg";

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#quland-hero-spark-clip)">
        <path
          d="M10.0005 10.9371L0.0507812 7.62184C0.132029 7.4156 0.3164 7.26529 0.535144 7.23435L6.68811 6.32812L10.0005 10.9371Z"
          fill="#FEC461"
        />
        <path
          d="M10.0002 10.937V16.6775L4.49725 19.6149C4.28475 19.7274 4.03195 19.709 3.83789 19.5649L10.0002 10.937Z"
          fill="#F7B84E"
        />
        <path
          d="M10.0005 10.937L3.83784 19.5646C3.64753 19.4243 3.55035 19.1837 3.59128 18.9431L4.64094 12.7248L10.0005 10.937Z"
          fill="#FEC461"
        />
        <path
          d="M10 10.9368L4.64079 12.7246L0.190595 8.31813C0.0190365 8.14938 -0.0437743 7.89595 0.0312237 7.66814C0.0377861 7.65252 0.0405985 7.63658 0.0502858 7.62158L10 10.9368Z"
          fill="#F7B84E"
        />
        <path
          d="M9.99992 0.312012V10.9367L6.6875 6.32748L9.44055 0.665128C9.54368 0.449196 9.76242 0.312012 9.99992 0.312012Z"
          fill="#FEC461"
        />
        <path
          d="M13.3124 6.32748L10 10.9367V0.312012C10.2375 0.312012 10.4562 0.449196 10.5594 0.665128L13.3124 6.32748Z"
          fill="#F7B84E"
        />
        <path
          d="M19.9497 7.62167L10 10.9369L13.3124 6.32764L19.4654 7.23386C19.6841 7.26511 19.8685 7.41511 19.9497 7.62167Z"
          fill="#FEC461"
        />
        <path
          d="M19.8123 8.31813L15.3592 12.7246L10 10.9368L19.9497 7.62158C19.9591 7.63689 19.9622 7.65283 19.9688 7.66814C20.0435 7.89626 19.981 8.14938 19.8123 8.31813Z"
          fill="#F7B84E"
        />
        <path
          d="M16.1623 19.5646L10 10.937L15.3592 12.7248L16.4092 18.9431C16.4498 19.184 16.353 19.4243 16.1623 19.5646Z"
          fill="#FEC461"
        />
        <path
          d="M16.1623 19.5646C15.9686 19.7087 15.7155 19.7274 15.5033 19.6146L10 16.6775V10.937L16.1623 19.5646Z"
          fill="#F7B84E"
        />
      </g>
      <defs>
        <clipPath id="quland-hero-spark-clip">
          <rect fill="white" height="20" width="20" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function QulandArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="11"
      viewBox="0 0 7 11"
      width="7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 10L5.29289 6.20711C5.62623 5.87377 5.79289 5.70711 5.79289 5.5C5.79289 5.29289 5.62623 5.12623 5.29289 4.79289L1.5 1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function QulandHeroShell({
  sectionId = "hero",
  className = "",
  eyebrowText,
  heading,
  subtitle,
  meta,
  actions,
  floatingTags = [],
}) {
  const sectionClassName = ["quland-hero", className].filter(Boolean).join(" ");

  return (
    <section id={sectionId} className={sectionClassName}>
      <div className="quland-hero__grid-bg" aria-hidden="true" />

      <div className="container">
        <div className="quland-hero__frame">
          <div className="quland-hero__glow" aria-hidden="true" />

          <div className="quland-hero__layout">
            <div className="quland-hero__content">
              {eyebrowText ? (
                <div className="quland-hero__eyebrow">
                  <SparkIcon />
                  <span>{eyebrowText}</span>
                </div>
              ) : null}

              {heading}

              {subtitle ? (
                <div className="quland-hero__copy-box">
                  <p>{subtitle}</p>
                </div>
              ) : null}

              {meta}
              {actions ? <div className="quland-hero__actions">{actions}</div> : null}
            </div>

            <div className="quland-hero__visual" aria-hidden="true">
              <div className="quland-hero__media-shell" />
              <div className="quland-hero__media-orb" />

              {floatingTags.map((tag, index) => (
                <span
                  key={`${tag.label}-${tag.className || "tag"}-${index}`}
                  className={`quland-hero__tag ${tag.className}`}
                >
                  {tag.label}
                </span>
              ))}

              <div className="quland-hero__image-wrap">
                <img className="quland-hero__image" src={heroMainImage} alt="" />
              </div>

              <img className="quland-hero__shadow" src={heroCircleShadow} alt="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
