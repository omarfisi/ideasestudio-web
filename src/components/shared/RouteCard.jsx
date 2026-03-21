import Button from "@/components/shared/Button.jsx";

export default function RouteCard({ route, index }) {
  return (
    <article className={`route-card route-card--${route.tone}`}>
      <div className="route-card__top">
        <span className="route-card__index">0{index + 1}</span>
        <span className="route-card__kicker">Ruta especializada</span>
      </div>

      <div className="route-card__body">
        <h3>{route.label}</h3>
        <p>{route.shortText}</p>
      </div>

      <Button to={route.path} variant="ghost" className="route-card__button">
        Explorar ruta
      </Button>
    </article>
  );
}
