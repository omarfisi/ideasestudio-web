function toggleChoice(list, value, checked) {
  const current = Array.isArray(list) ? list : [];
  if (checked) return Array.from(new Set([...current, value]));
  return current.filter((item) => item !== value);
}

export default function PublicFormField({ field, value, onChange, error }) {
  const wrapperClass = field.width === "half" ? "md:col-span-1" : "md:col-span-2";
  const baseInput =
    "w-full rounded-2xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300/40 " +
    (error ? "border-red-300 bg-red-50" : "border-neutral-200 bg-white focus:border-amber-400");

  if (field.type === "hidden") {
    return <input type="hidden" name={field.name} value={value || field.default_value || ""} />;
  }

  if (field.type === "section") {
    return (
      <div className="md:col-span-2 rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {field.label}
        </div>
        {field.help_text ? (
          <p className="mt-2 text-sm text-neutral-600">{field.help_text}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {field.type !== "checkbox" ? (
        <label className="mb-2 block text-sm font-medium text-neutral-900">
          {field.label}
          {field.required ? <span className="ml-1 text-amber-500">*</span> : null}
        </label>
      ) : null}

      {field.type === "textarea" ? (
        <textarea
          rows={4}
          name={field.name}
          value={value || ""}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder || ""}
          className={baseInput}
        />
      ) : null}

      {field.type === "select" ? (
        <select
          name={field.name}
          value={value || field.default_value || ""}
          onChange={(event) => onChange(field.name, event.target.value)}
          className={baseInput}
        >
          <option value="">{field.placeholder || "Selecciona una opción"}</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "radio" ? (
        <div className="grid gap-2 rounded-3xl border border-neutral-200 bg-white p-3">
          {(field.options || []).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors ${
                value === option.value
                  ? "border-neutral-900 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-300"
              }`}
            >
              <input
                type="radio"
                name={field.name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(field.name, option.value)}
                className="mt-0.5 h-4 w-4 accent-amber-400"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {field.type === "checkbox_group" ? (
        <div className="grid gap-2 rounded-3xl border border-neutral-200 bg-white p-3 md:grid-cols-2">
          {(field.options || []).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors ${
                Array.isArray(value) && value.includes(option.value)
                  ? "border-amber-400 bg-amber-50 text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-300"
              }`}
            >
              <input
                type="checkbox"
                name={`${field.name}[]`}
                value={option.value}
                checked={Array.isArray(value) && value.includes(option.value)}
                onChange={(event) =>
                  onChange(field.name, toggleChoice(value, option.value, event.target.checked))
                }
                className="mt-0.5 h-4 w-4 rounded accent-amber-400"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {field.type === "checkbox" ? (
        <label className="flex items-start gap-3 rounded-3xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-700">
          <input
            type="checkbox"
            name={field.name}
            checked={!!value}
            onChange={(event) => onChange(field.name, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-amber-400"
          />
          <span>
            {field.label}
            {field.required ? <span className="ml-1 text-amber-500">*</span> : null}
          </span>
        </label>
      ) : null}

      {!["textarea", "select", "radio", "checkbox_group", "checkbox"].includes(field.type) ? (
        <input
          type={field.type}
          name={field.name}
          value={value || ""}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder || ""}
          className={baseInput}
        />
      ) : null}

      {field.help_text && !error ? (
        <p className="mt-2 text-xs text-neutral-500">{field.help_text}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
