export default function TestimonialsSection({ eyebrow, title, description, items = [] }) {
  if (!items.length) return null;

  return (
    <section className="section section-split testimonials-section">
      <div className="container">
        <div className="testimonials-section__intro">
          {eyebrow ? (
            <span className="testimonials-section__eyebrow">{eyebrow}</span>
          ) : null}
          <h2 className="testimonials-section__title">{title}</h2>
          {description ? (
            <p className="testimonials-section__description">{description}</p>
          ) : null}
        </div>

        <div className="testimonials-section__grid">
          {items.map((item) => (
            <blockquote key={item.id} className="testimonial-card">
              <p className="testimonial-card__quote">{item.quote}</p>
              <footer className="testimonial-card__footer">
                <span className="testimonial-card__name">{item.name}</span>
                {item.source ? (
                  <span className="testimonial-card__source">{item.source}</span>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
