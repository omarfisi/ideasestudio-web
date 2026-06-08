/**
 * HighlightedHeading
 *
 * Renders a heading where the leading `highlight` substring gets a solid
 * yellow background block (Ideas Estudio accent #F9D001), black text, and
 * slight horizontal padding — a clean "marker" effect with no border-radius.
 *
 * Props:
 *   text             {string}  Full heading text.
 *   highlight        {string}  Substring at the start of `text` to highlight.
 *                              If falsy or not found, renders the full text unstyled.
 *   as               {string}  HTML tag to use — default "h1".
 *   className        {string}  Extra classes for the heading element.
 *   highlightClassName {string} Extra classes for the highlight span (overrides defaults).
 *
 * Usage:
 *   <HighlightedHeading
 *     as="h1"
 *     highlight="Soluciones"
 *     text="Soluciones para marcas y negocios que necesitan crecer con claridad."
 *   />
 */
export default function HighlightedHeading({
  text = "",
  highlight = "",
  as: Tag = "h1",
  className = "",
  highlightClassName = "",
}) {
  if (!text) return null;

  // If no highlight phrase provided, or it doesn't appear in text, render plain.
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return <Tag className={className}>{text}</Tag>;
  }

  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  const before = text.slice(0, idx);
  const matched = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);

  const highlightSpanClass =
    highlightClassName ||
    "inline bg-[#F9D001] text-[#0B0B0D] px-[0.18em] py-[0.04em]";

  return (
    <Tag className={className}>
      {before}
      <span className={highlightSpanClass}>{matched}</span>
      {after}
    </Tag>
  );
}
