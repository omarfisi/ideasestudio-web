export default function CanvasBlock({
  label,
  title,
  note,
  minHeight = "260px",
}) {
  return (
    <section className="canvas-block" style={{ minHeight }}>
      <div className="canvas-block__inner">
        <span className="canvas-block__label">{label}</span>
        <h2 className="canvas-block__title">{title}</h2>
        <p className="canvas-block__note">{note}</p>
      </div>
    </section>
  );
}
