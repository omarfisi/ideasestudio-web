const VARIANT_STYLES = {
  dark:   "bg-neutral-950 text-white",
  light:  "bg-white text-neutral-950 border border-neutral-200",
  yellow: "bg-[#f1d146] text-neutral-950",
};

const BTN_STYLES = {
  dark:   "bg-[#f1d146] text-neutral-950 hover:bg-yellow-300",
  light:  "bg-neutral-950 text-white hover:bg-neutral-800",
  yellow: "bg-neutral-950 text-white hover:bg-neutral-800",
};

export default function CtaBlock({ settings = {} }) {
  const { title, subtitle, button_label, button_url, variant = "dark" } = settings;
  if (!title && !button_label) return null;

  const wrapClass = VARIANT_STYLES[variant] || VARIANT_STYLES.dark;
  const btnClass  = BTN_STYLES[variant]  || BTN_STYLES.dark;
  const subtitleColor = variant === "dark" ? "text-neutral-300" : "text-neutral-600";

  return (
    <div className={`rounded-[1.75rem] p-6 shadow-sm md:p-8 ${wrapClass}`}>
      {title ? (
        <h3 className="text-2xl font-semibold leading-tight md:text-3xl">{title}</h3>
      ) : null}
      {subtitle ? (
        <p className={`mt-3 text-sm leading-6 ${subtitleColor}`}>{subtitle}</p>
      ) : null}
      {button_label && button_url ? (
        <div className="mt-6">
          <a
            href={button_url}
            className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${btnClass}`}
          >
            {button_label}
          </a>
        </div>
      ) : null}
    </div>
  );
}
