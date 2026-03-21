import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";

export default function RouteErrorPage() {
  const error = useRouteError();

  let title = "No se pudo cargar la informacion";
  let message =
    "La capa publica no pudo completar la solicitud al backend en este momento.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Recurso no encontrado" : title;
    message =
      typeof error.data === "string"
        ? error.data
        : error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="empty-state">
          <h1>{title}</h1>
          <p>{message}</p>
          <div className="empty-state__actions">
            <Button to="/">Volver al inicio</Button>
            <Button to="/servicios" variant="secondary">
              Reintentar desde catalogo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
