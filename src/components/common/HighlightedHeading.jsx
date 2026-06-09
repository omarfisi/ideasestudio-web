/**
 * HighlightedHeading
 *
 * Renders a heading where the `highlight` substring gets the same visual
 * treatment as PortfolioPage, TeamPage, etc.: yellow block + 4 black corner
 * dots via the global `.highlight-box-glow` class (App.css lines 75-99).
 *
 * Props:
 *   text             {string}  Full heading text.
 *   highlight        {string}  Substring to highlight.
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

  // Reuse the same global class used across PortfolioPage, TeamPage, ServicesPage, etc.
  // It paints a yellow box + 4 black corner dots via ::before pseudo-element (App.css).
  const highlightSpanClass = highlightClassName || "highlight-box-glow";

  return (
    <Tag className={className}>
      {before}
      <span className={highlightSpanClass}>{matched}</span>
      {after}
    </Tag>
  );
}
