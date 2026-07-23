import { Link } from "react-router-dom";

const STATUS_COPY = {
  missing_selection: {
    title: "Selecciona un plan primero",
    subtitle: "Vuelve al servicio y elige un plan desde 'Conocer planes' para continuar.",
  },
  loading: {
    title: "Cargando tu plan…",
    subtitle: "Un momento, estamos confirmando los detalles con nuestro sistema.",
  },
  error: {
    title: "No pudimos cargar este plan",
    subtitle: "El plan seleccionado ya no está disponible, o el servicio ya no forma parte de él.",
  },
  ready: {
    title: "Completa tu membresía",
    subtitle: "Revisa el resumen de tu plan y confirma tus datos para continuar al pago seguro.",
  },
};

/**
 * Compact checkout header — deliberately not the site's big marketing
 * PageHero (cream background, large clamp() title): a payment step reads
 * as more trustworthy when it looks like a checkout, not a landing page.
 * "Membresías" in the breadcrumb is plain text, not a link — there is no
 * routed plans catalog page today (MembershipPlansSection.jsx exists but
 * isn't wired to any route), so linking it would 404.
 */
export default function MembershipCheckoutHero({ status }) {
  const copy = STATUS_COPY[status] || STATUS_COPY.ready;

  return (
    <div className="container membership-checkout-hero">
      <nav aria-label="Breadcrumb" className="membership-checkout-hero__breadcrumb">
        <Link to="/servicios">Servicios</Link>
        <span aria-hidden="true">/</span>
        <span>Membresías</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Checkout</span>
      </nav>

      <span className="eyebrow-yellow">Membresía</span>
      <h1 className="membership-checkout-hero__title">{copy.title}</h1>
      <p className="body-md membership-checkout-hero__subtitle">{copy.subtitle}</p>
    </div>
  );
}
