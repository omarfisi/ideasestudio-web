import Button from "@/components/shared/Button.jsx";

export default function HeroBlock({ settings = {} }) {
  const { title, subtitle, button_label, secondary_label, secondary_url } = settings;
  if (!title && !subtitle) return null;

  return (
    <div>
      {title ? (
        <h2 className="text-3xl font-semibold leading-tight text-neutral-950 md:text-5xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700 md:text-lg">
          {subtitle}
        </p>
      ) : null}
      {(button_label || secondary_label) ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {button_label ? (
            <Button href="#business-intake-form">{button_label}</Button>
          ) : null}
          {secondary_label && secondary_url ? (
            <Button href={secondary_url} variant="secondary">{secondary_label}</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
