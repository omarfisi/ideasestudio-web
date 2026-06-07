function toggleChoice(list, value, checked) {
  const current = Array.isArray(list) ? list : [];
  if (checked) return Array.from(new Set([...current, value]));
  return current.filter((item) => item !== value);
}

function SectionDivider({ field }) {
  return (
    <div className="md:col-span-2 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {field.label}
          </div>
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {field.help_text ? (
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-500">
          {field.help_text}
        </p>
      ) : null}
    </div>
  );
}

export default function PublicFormField({ field, value, onChange, error }) {
  if (!field || field.visible === false) return null;

  const wrapperClass = field.width === "half" ? "md:col-span-1" : "md:col-span-2";
  const baseInput =
    "w-full rounded-xl border px-4 py-3.5 text-sm text-slate-900 shadow-sm transition-all " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-4 " +
    (error
      ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 bg-white focus:border-[#102a2a] focus:ring-[#f8d000]/20");

  if (field.type === "hidden") {
    return <input type="hidden" name={field.name} value={value || field.default_value || ""} />;
  }

  if (field.type === "section") {
    return <SectionDivider field={field} />;
  }

  const options = Array.isArray(field.options) ? field.options : [];
  const optionsGridClass =
    options.length > 2 ? "grid gap-3 md:grid-cols-2" : "grid gap-3 sm:grid-cols-2";

  return (
    <div className={wrapperClass}>
      {field.type !== "checkbox" ? (
        <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {field.label}
          {field.required ? <span className="ml-1 text-amber-500">*</span> : null}
        </label>
      ) : null}

      {field.type === "textarea" ? (
        <textarea
          rows={5}
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
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "radio" ? (
        <div className={optionsGridClass}>
          {options.map((option) => {
            const checked = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all ${
                  checked
                    ? "border-[#102a2a] bg-[#102a2a]/5 text-[#102a2a] shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(field.name, option.value)}
                  className="mt-0.5 h-4 w-4 accent-[#102a2a]"
                />
                <span className="leading-6">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {field.type === "checkbox_group" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => {
            const checked = Array.isArray(value) && value.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all ${
                  checked
                    ? "border-[#102a2a] bg-[#102a2a]/5 text-[#102a2a] shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  name={`${field.name}[]`}
                  value={option.value}
                  checked={checked}
                  onChange={(event) =>
                    onChange(field.name, toggleChoice(value, option.value, event.target.checked))
                  }
                  className="mt-0.5 h-4 w-4 rounded accent-[#102a2a]"
                />
                <span className="leading-6">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {field.type === "checkbox" ? (
        <label
          className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm transition-all ${
            error
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <input
            type="checkbox"
            name={field.name}
            checked={!!value}
            onChange={(event) => onChange(field.name, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-[#102a2a]"
          />
          <span className="leading-6">
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
        <p className="mt-2 text-xs text-slate-500">{field.help_text}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
