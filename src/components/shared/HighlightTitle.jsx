/**
 * Wraps specific words inside a text string with .text-highlight-yellow spans.
 * Safe to use inside any heading — no raw HTML in data needed.
 *
 * Usage:
 *   <h2><HighlightTitle text={title} words={["presencia visual"]} /></h2>
 */
export default function HighlightTitle({ text, words }) {
  if (!words?.length || !text) return text;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  const lowerWords = words.map((w) => w.toLowerCase());

  return parts.map((part, i) =>
    lowerWords.includes(part.toLowerCase()) ? (
      <span key={i} className="text-highlight-yellow">
        {part}
      </span>
    ) : (
      part
    )
  );
}
