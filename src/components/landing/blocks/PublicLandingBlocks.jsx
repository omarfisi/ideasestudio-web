import HeroBlock       from "@/components/landing/blocks/HeroBlock.jsx";
import TextBlock       from "@/components/landing/blocks/TextBlock.jsx";
import MediaBlock      from "@/components/landing/blocks/MediaBlock.jsx";
import FormBlock       from "@/components/landing/blocks/FormBlock.jsx";
import LogoSliderBlock from "@/components/landing/blocks/LogoSliderBlock.jsx";
import BenefitsBlock   from "@/components/landing/blocks/BenefitsBlock.jsx";
import CtaBlock        from "@/components/landing/blocks/CtaBlock.jsx";
import FaqBlock        from "@/components/landing/blocks/FaqBlock.jsx";
import ColumnsBlock    from "@/components/landing/blocks/ColumnsBlock.jsx";

function BlockRenderer({
  block,
  assets,
  formConfig,
  formConfigMap,
  formErrors,
  pendingFormSlugs,
  loading,
  error,
  defaultFormSlug,
}) {
  const s = block.settings || {};
  switch (block.block_type) {
    case "hero":        return <HeroBlock        settings={s} />;
    case "text":        return <TextBlock        settings={s} />;
    case "media":       return <MediaBlock       settings={s} />;
    case "form":
      return (
        <FormBlock
          settings={s}
          formConfig={formConfig}
          formConfigMap={formConfigMap}
          formErrors={formErrors}
          pendingFormSlugs={pendingFormSlugs}
          loading={loading}
          error={error}
          defaultFormSlug={defaultFormSlug}
        />
      );
    case "logo_slider": return <LogoSliderBlock  settings={s} assets={assets} />;
    case "benefits":    return <BenefitsBlock    settings={s} />;
    case "cta":         return <CtaBlock         settings={s} />;
    case "faq":         return <FaqBlock         settings={s} />;
    case "columns":     return <ColumnsBlock     settings={s} />;
    default:            return null;
  }
}

export default function PublicLandingBlocks({
  blocks = [],
  assets = [],
  formConfig,
  formConfigMap = {},
  formErrors = {},
  pendingFormSlugs = [],
  loading,
  error,
  defaultFormSlug = "",
}) {
  const active = blocks
    .filter((b) => b.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (!active.length) return null;

  return (
    <div className="space-y-8">
      {active.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          assets={assets}
          formConfig={formConfig}
          formConfigMap={formConfigMap}
          formErrors={formErrors}
          pendingFormSlugs={pendingFormSlugs}
          loading={loading}
          error={error}
          defaultFormSlug={defaultFormSlug}
        />
      ))}
    </div>
  );
}
