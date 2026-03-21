import { useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";

const modeLabels = {
  buy: "Compra directa",
  booking: "Reserva con deposito",
  proposal: "Propuesta",
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get("service") || "Servicio pendiente";
  const mode = searchParams.get("mode") || "buy";

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="Estructura base para pago o separacion"
        subtitle="El flujo real de cobro se conectara despues al backend, pero la interfaz publica ya deja visible la intencion del usuario."
      />

      <section className="section">
        <div className="container detail-grid">
          <form className="detail-panel">
            <h2>Datos del cliente</h2>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input type="text" placeholder="Tu nombre" />
              </label>

              <label className="field">
                <span>Email</span>
                <input type="email" placeholder="tu@email.com" />
              </label>

              <label className="field">
                <span>Telefono</span>
                <input type="text" placeholder="Tu telefono" />
              </label>

              <label className="field">
                <span>Metodo</span>
                <select defaultValue="card">
                  <option value="card">Tarjeta</option>
                  <option value="deposit">Deposito</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </label>
            </div>

            <Button type="button">Continuar pago</Button>
          </form>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Servicio</span>
              <strong>{service}</strong>
            </div>
            <div className="summary-row">
              <span>Modo</span>
              <strong>{modeLabels[mode] || "Compra directa"}</strong>
            </div>
            <div className="summary-row">
              <span>Estado</span>
              <strong>Pendiente de integracion</strong>
            </div>

            <p className="detail-summary__note">
              Esta pantalla se convertira luego en el puente hacia cobros,
              ordenes o reservas reales una vez definamos el contrato con el CRM.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
