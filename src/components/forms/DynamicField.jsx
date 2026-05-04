export default function DynamicField({ field, value, onChange, error, disabled = false }) {
  const base =
    "w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/30 " +
    (error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white focus:border-slate-500") +
    (disabled ? " opacity-60 cursor-not-allowed" : "");

  if (field.type === "hidden") {
    return <input type="hidden" name={field.name} value={value || field.default_value || ""} />;
  }

  return (
    <div className={field.width === "half" ? "col-span-1" : "col-span-2"}>
      {field.type !== "checkbox" && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {field.label}
          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      {field.type === "textarea" && (
        <textarea
          name={field.name}
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          disabled={disabled}
          rows={4}
          className={base}
        />
      )}

      {field.type === "select" && (
        <select
          name={field.name}
          value={value || field.default_value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          disabled={disabled}
          className={base}
        >
          <option value="">{field.placeholder || "Selecciona una opción…"}</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "checkbox" && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name={field.name}
            checked={!!value}
            onChange={(e) => onChange(field.name, e.target.checked)}
            required={field.required}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
          />
          <span className="text-sm text-slate-700">{field.label}</span>
        </label>
      )}

      {!["textarea", "select", "checkbox"].includes(field.type) && (
        <input
          type={field.type}
          name={field.name}
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          disabled={disabled}
          className={base}
        />
      )}

      {field.help_text && !error && (
        <p className="mt-1 text-xs text-slate-400">{field.help_text}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
