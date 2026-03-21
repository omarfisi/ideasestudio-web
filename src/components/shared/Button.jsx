import { Link } from "react-router-dom";

const variantClassMap = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  dark: "btn btn-dark",
};

export default function Button({
  to,
  href,
  variant = "primary",
  block = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    variantClassMap[variant] || variantClassMap.primary,
    block ? "btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
