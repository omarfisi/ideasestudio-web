import CTASection from "@/components/shared/CTASection.jsx";

export default function FinalCTA() {
  return (
    <CTASection
      title="Base lista para crecer y conectar el CRM despues"
      text="La fundacion del frontend ya contempla rutas, detalle de servicios, filtros, checkout base y formularios. Cuando compartas como expone la data tu backend, el cambio principal vivira en la capa de API."
      primaryLabel="Explorar servicios"
      primaryTo="/servicios"
      secondaryLabel="Ir a contacto"
      secondaryTo="/contacto"
    />
  );
}
