import { useEffect, useMemo, useState } from "react";
import HighlightTitle from "@/components/shared/HighlightTitle.jsx";

function chunkItems(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function getSlidesPerView() {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 720) return 1;
  if (window.innerWidth <= 1100) return 2;
  return 3;
}

function StarRow({ count = 5 }) {
  return (
    <div className="testimonials-slider__stars" aria-label={`${count} estrellas`}>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index}>★</span>
      ))}
    </div>
  );
}

function Avatar({ name, avatar }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="testimonials-slider__avatar-image"
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="testimonials-slider__avatar-placeholder" aria-hidden="true">
      {initials || "IE"}
    </div>
  );
}

function SourceBadge({ source }) {
  if (source === "facebook") {
    return (
      <span className="testimonials-slider__source-badge is-facebook" aria-label="Facebook Reviews">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H16.7V5c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V11H7.2v3H10v8h3.5z"
            fill="currentColor"
          />
        </svg>
        <span>Facebook</span>
      </span>
    );
  }

  if (source === "google") {
    return (
      <span className="testimonials-slider__source-badge is-google" aria-label="Google Reviews">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.3z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.8 0 5.2-.9 7-2.5l-3.2-2.5c-.9.6-2.1 1-3.8 1-2.9 0-5.3-1.9-6.2-4.6H2.5v2.6C4.3 19.5 7.9 22 12 22z"
            fill="#34A853"
          />
          <path
            d="M5.8 13.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7H2.5C1.9 8.3 1.5 9.8 1.5 11.5s.4 3.2 1 4.5l3.3-2.6z"
            fill="#FBBC05"
          />
          <path
            d="M12 5c1.5 0 2.8.5 3.8 1.4L18.6 4C17.2 2.7 14.8 2 12 2 7.9 2 4.3 4.5 2.5 8l3.3 2.6C6.7 6.9 9.1 5 12 5z"
            fill="#EA4335"
          />
        </svg>
        <span>Google</span>
      </span>
    );
  }

  return null;
}

export default function TestimonialsSlider({
  title,
  titleNode,
  titleHighlight,
  description,
  items = [],
  autoPlay = true,
  interval = 15000,
}) {
  const [slidesPerView, setSlidesPerView] = useState(getSlidesPerView);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    function handleResize() {
      setSlidesPerView(getSlidesPerView());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pages = useMemo(() => {
    return chunkItems(items, slidesPerView);
  }, [items, slidesPerView]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [slidesPerView, items.length]);

  useEffect(() => {
    if (!autoPlay || pages.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pages.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [autoPlay, interval, pages.length]);

  if (!items.length) return null;

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + pages.length) % pages.length);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pages.length);
  };

  return (
    <section className="section section-split">
      <div className="container">
        <div className="testimonials-slider">
          <div className="testimonials-slider__intro">
            {titleNode ? <h2>{titleNode}</h2> : title ? <h2><HighlightTitle text={title} words={titleHighlight} /></h2> : null}
            {description ? <p>{description}</p> : null}
          </div>

          <div className="testimonials-slider__viewport">
            <div className="testimonials-slider__controls">
              <button
                type="button"
                className="testimonials-slider__arrow"
                onClick={goPrev}
                aria-label="Testimonio anterior"
              >
                ←
              </button>

              <button
                type="button"
                className="testimonials-slider__arrow"
                onClick={goNext}
                aria-label="Siguiente testimonio"
              >
                →
              </button>
            </div>

            <div className="testimonials-slider__track-wrap">
              {pages.map((page, pageIndex) => (
                <div
                  key={pageIndex}
                  className={`testimonials-slider__page ${
                    pageIndex === currentIndex ? "is-active" : ""
                  }`}
                >
                  <div className="testimonials-slider__grid">
                    {page.map((item) => (
                      <article key={item.id} className="testimonials-slider__card">
                        <div className="testimonials-slider__card-top">
                          <StarRow count={item.rating || 5} />
                          <SourceBadge source={item.source} />
                        </div>

                        <p className="testimonials-slider__quote">{item.quote}</p>

                        <div className="testimonials-slider__author">
                          <div className="testimonials-slider__avatar">
                            <Avatar name={item.name} avatar={item.avatar} />
                          </div>

                          <div className="testimonials-slider__author-copy">
                            <h3>{item.name}</h3>
                            <span>{item.meta || "Cliente"}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pages.length > 1 ? (
              <div className="testimonials-slider__dots" aria-label="Paginación de testimonios">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`testimonials-slider__dot ${
                      index === currentIndex ? "is-active" : ""
                    }`}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Ir al grupo ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
