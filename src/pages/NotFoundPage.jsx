import Button from "@/components/shared/Button.jsx";

export default function NotFoundPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="empty-state">
          <h1>Pagina no encontrada</h1>
          <p>La ruta solicitada no existe dentro de la capa publica actual.</p>
          <div className="empty-state__actions">
            <Button to="/">Volver al inicio</Button>
            <Button to="/servicios" variant="secondary">
              Ir a servicios
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
