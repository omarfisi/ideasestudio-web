// Editorial visual block components for blog post rendering.
// Each component mirrors the CRM editor block types.

// ── EditorialNumberCards ──────────────────────────────────────────────────────
function EditorialNumberCards({ block }) {
  const { eyebrow, title, description, items = [] } = block;
  return (
    <section className="my-12 md:my-16">
      {(eyebrow || title || description) && (
        <div className="mb-8 md:mb-10">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b38f00]">{eyebrow}</p>
          )}
          {title && (
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <span className="absolute -top-3 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#f2cc3d] text-sm font-black text-black">
              {String(idx + 1).padStart(2, "0")}
            </span>
            {item.icon && (
              <span className="mb-3 block text-2xl">{item.icon}</span>
            )}
            <h3 className="mt-2 text-base font-bold text-slate-900">{item.title}</h3>
            {item.subtitle && (
              <p className="mt-0.5 text-sm font-semibold text-slate-400">{item.subtitle}</p>
            )}
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── EditorialSteps ────────────────────────────────────────────────────────────
function EditorialSteps({ block }) {
  const { eyebrow, title, description, items = [] } = block;
  return (
    <section className="my-12 md:my-16">
      {(eyebrow || title || description) && (
        <div className="mb-8">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b38f00]">{eyebrow}</p>
          )}
          {title && (
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      )}
      <ol className="relative border-l-2 border-[#f2cc3d]">
        {items.map((item, idx) => (
          <li key={idx} className="relative pl-10 pb-8 last:pb-0">
            <span className="absolute left-0 top-0 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-[#f2cc3d] text-xs font-black text-black ring-4 ring-white">
              {idx + 1}
            </span>
            <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
            {item.description && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── VisualBulletGrid ──────────────────────────────────────────────────────────
function VisualBulletGrid({ block }) {
  const { eyebrow, title, description, items = [], variant } = block;
  const isRows = variant === "rows" || block.blockType === "bullet_rows";

  return (
    <section className="my-12 md:my-16">
      {(eyebrow || title || description) && (
        <div className="mb-8">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b38f00]">{eyebrow}</p>
          )}
          {title && (
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      )}

      {isRows ? (
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm"
            >
              {item.icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2cc3d] text-base font-bold text-black">
                  {item.icon}
                </span>
              )}
              <span className="text-sm font-semibold text-slate-800">{item.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              {item.icon && (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2cc3d] text-lg font-bold text-black">
                  {item.icon}
                </span>
              )}
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              {item.description && (
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── EditorialNumberCardsCarousel ──────────────────────────────────────────────
function EditorialNumberCardsCarousel({ block }) {
  const { eyebrow, title, description, items = [] } = block;
  return (
    <section className="my-14 md:my-16">
      {(eyebrow || title || description) && (
        <div className="mb-8 md:mb-10">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b38f00]">{eyebrow}</p>
          )}
          {title && (
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      )}
      <div className="-mx-4 overflow-x-auto px-4 pb-6 [scrollbar-width:thin]">
        <div className="flex snap-x snap-mandatory gap-6" style={{ width: "max-content" }}>
          {items.map((item, idx) => {
            const number = String(idx + 1).padStart(2, "0");
            return (
              <article
                key={idx}
                className="relative flex min-h-[400px] w-[300px] snap-start flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.08)]"
              >
                {item.image_url ? (
                  <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={item.image_url}
                      alt={item.image_alt || item.title || ""}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute left-5 top-0 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#f2cc3d] text-base font-black text-slate-950 shadow-[0_8px_20px_rgba(242,204,61,0.4)]">
                      {number}
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-20 w-full shrink-0 items-end px-6 pb-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
                      {item.icon || "✦"}
                    </div>
                    <div className="absolute left-5 top-0 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#f2cc3d] text-base font-black text-slate-950 shadow-[0_8px_20px_rgba(242,204,61,0.4)]">
                      {number}
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6 pt-4">
                  <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                  {item.subtitle && (
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.subtitle}</p>
                  )}
                  {item.description && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  )}
                  <div className="mt-auto pt-5">
                    <div className="h-0.5 w-8 rounded-full bg-[#f2cc3d]" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {items.length > 2 && (
        <p className="mt-1 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Desliza para ver más →
        </p>
      )}
    </section>
  );
}

// ── BlogVisualBlock — dispatcher ──────────────────────────────────────────────
export default function BlogVisualBlock({ block }) {
  if (!block) return null;

  switch (block.blockType) {
    case "number_cards":
      if (block.variant === "carousel_cards") {
        return <EditorialNumberCardsCarousel block={block} />;
      }
      return <EditorialNumberCards block={block} />;
    case "steps":
      return <EditorialSteps block={block} />;
    case "bullet_grid":
      return <VisualBulletGrid block={block} />;
    case "bullet_rows":
      return <VisualBulletGrid block={block} />;
    default:
      return <EditorialNumberCards block={block} />;
  }
}
