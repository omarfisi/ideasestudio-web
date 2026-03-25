export default function ServiceIncludesList({
  title = "Incluye",
  items = [],
  className = "",
}) {
  if (!items.length) {
    return null;
  }

  const classes = ["service-includes", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {title ? <h3>{title}</h3> : null}
      <ul className="service-includes__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
