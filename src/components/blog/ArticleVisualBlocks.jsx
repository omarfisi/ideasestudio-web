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
      <ol className="relative space-y-0 border-l-2 border-[#f2cc3d] pl-10">
        {items.map((item, idx) => (
          <li key={idx} className="relative flex items-start gap-4 pb-8 last:pb-0">
            <span className="absolute -left-[1.1rem] top-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2cc3d] text-xs font-black text-black ring-4 ring-white">
              {idx + 1}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
              )}
            </div>
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

// ── BlogVisualBlock — dispatcher ──────────────────────────────────────────────
export default function BlogVisualBlock({ block }) {
  if (!block) return null;

  switch (block.blockType) {
    case "number_cards":
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
