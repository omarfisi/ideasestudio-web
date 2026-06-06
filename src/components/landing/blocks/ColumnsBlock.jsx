const GRID_CLASS = {
  1: "grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

function ColumnCard({ item }) {
  const { title, body, image_url, button_label, button_url } = item;
  if (!title && !body && !image_url) return null;

  return (
    <article className="flex flex-col rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm">
      {image_url ? (
        <div className="mb-4 overflow-hidden rounded-2xl">
          <img
            src={image_url}
            alt={title || ""}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      {title ? (
        <h4 className="text-base font-semibold text-neutral-950">{title}</h4>
      ) : null}

      {body ? (
        <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-6 text-neutral-700">{body}</p>
      ) : null}

      {button_label && button_url ? (
        <div className="mt-4">
          <a
            href={button_url}
            className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            {button_label}
          </a>
        </div>
      ) : null}
    </article>
  );
}

export default function ColumnsBlock({ settings = {} }) {
  const { title, subtitle, items } = settings;
  const cols = Number(settings.columns) || 3;
  const list = Array.isArray(items) ? items.filter((i) => i?.title || i?.body || i?.image_url) : [];

  if (!list.length) return null;

  const gridClass = GRID_CLASS[cols] || GRID_CLASS[3];

  return (
    <div>
      {title ? (
        <h3 className="text-xl font-semibold text-neutral-950">{title}</h3>
      ) : null}
      {subtitle ? (
        <p className="mt-2 text-sm leading-6 text-neutral-600">{subtitle}</p>
      ) : null}

      <div className={`mt-4 grid gap-4 ${gridClass}`}>
        {list.map((item, index) => (
          <ColumnCard key={index} item={item} />
        ))}
      </div>
    </div>
  );
}
