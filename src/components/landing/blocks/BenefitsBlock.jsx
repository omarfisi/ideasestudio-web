export default function BenefitsBlock({ settings = {} }) {
  const { title, items } = settings;
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return null;

  return (
    <div>
      {title ? (
        <h3 className="mb-4 text-lg font-semibold text-neutral-950">{title}</h3>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((item, index) => (
          <article
            key={`${item}-${index}`}
            className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-neutral-950">
              {index + 1}
            </div>
            <p className="text-sm leading-6 text-neutral-700">{item}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
