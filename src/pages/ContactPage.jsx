import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { submitPublicContact } from "@/lib/api.js";

const modeLabels = {
  proposal: "Propuesta",
  buy: "Compra",
  booking: "Reserva",
};

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get("service") || "";
  const serviceSlug = searchParams.get("serviceSlug") || "";
  const clientType = searchParams.get("clientType") || "";
  const mode = searchParams.get("mode") || "proposal";
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    mode,
    service,
    message: "",
  });
  const [submitState, setSubmitState] = useState({
    status: "idle",
    message: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({
      status: "loading",
      message: "Enviando solicitud...",
    });

    try {
      const result = await submitPublicContact({
        ...formData,
        serviceSlug,
        clientType,
      });

      setSubmitState({
        status: "success",
        message: result.message || "Solicitud enviada correctamente.",
      });

      setFormData((current) => ({
        ...current,
        name: "",
        email: "",
        phone: "",
        message: "",
      }));
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la solicitud.",
      });
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Solicita propuesta, reserva o consulta"
        subtitle="Esta vista ya crea contactos reales en el CRM y conserva el contexto publico dentro de la nota comercial."
      />

      <section className="section">
        <div className="container detail-grid">
          <form className="detail-panel" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                />
              </label>

              <label className="field">
                <span>Telefono</span>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Tu telefono"
                />
              </label>

              <label className="field">
                <span>Tipo de solicitud</span>
                <select name="mode" value={formData.mode} onChange={handleChange}>
                  <option value="proposal">Solicitar propuesta</option>
                  <option value="buy">Consulta de compra</option>
                  <option value="booking">Reserva o disponibilidad</option>
                </select>
              </label>

              <label className="field field--full">
                <span>Servicio de interes</span>
                <input
                  type="text"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  placeholder="Servicio"
                />
              </label>

              <label className="field field--full">
                <span>Mensaje</span>
                <textarea
                  rows="6"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Cuentanos que necesitas, fecha, contexto, presupuesto o cualquier dato importante."
                />
              </label>
            </div>

            {submitState.status !== "idle" ? (
              <p className={`form-status form-status--${submitState.status}`}>
                {submitState.message}
              </p>
            ) : null}

            <Button type="submit" disabled={submitState.status === "loading"}>
              {submitState.status === "loading"
                ? "Enviando..."
                : "Enviar solicitud"}
            </Button>
          </form>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Estado</span>
              <strong>
                {submitState.status === "success" ? "Enviado" : "Activo"}
              </strong>
            </div>
            <div className="summary-row">
              <span>Destino</span>
              <strong>POST /contacts</strong>
            </div>
            <div className="summary-row">
              <span>Modo detectado</span>
              <strong>{modeLabels[formData.mode] || "Propuesta"}</strong>
            </div>

            <p className="detail-summary__note">
              Este formulario ya crea un contacto real y empaqueta el contexto de
              la web publica en `source`, `tags`, `tipo` y `notes`.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
