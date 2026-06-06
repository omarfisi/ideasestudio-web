export default function TextBlock({ settings = {} }) {
  const { title, body, alignment = "left" } = settings;
  if (!title && !body) return null;

  const alignClass = alignment === "center" ? "text-center" : "text-left";

  return (
    <div className={`rounded-[1.75rem] border border-neutral-200 bg-white p-6 shadow-sm ${alignClass}`}>
      {title ? (
        <h3 className="text-xl font-semibold text-neutral-950">{title}</h3>
      ) : null}
      {body ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700">
          {body}
        </p>
      ) : null}
    </div>
  );
}
