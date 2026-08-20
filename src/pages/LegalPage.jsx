import { Link, useLocation } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { SITE_CONTACT } from "@/lib/siteContact.js";

const BRAND_NAME = "Ideas Estudio";
const CONTROLLER_NAME = "OSVALDO MARFISI RODRIGUEZ";
const PUBLIC_ORIGIN = "https://www.ideasestudio.com";

const LEGAL_PAGES = {
  privacy: {
    canonicalPath: "privacy-policy",
    title: "Política de Privacidad",
    description: "Cómo Ideas Estudio recopila, utiliza y protege la información compartida a través de su sitio web público.",
    eyebrow: "Transparencia",
    intro: "Esta política explica cómo tratamos la información cuando visitas nuestro sitio web, solicitas información, compras un servicio o conectas una integración.",
    sections: [
      ["Información que podemos recibir", [
        "Podemos recibir la información de contacto que proporcionas voluntariamente, como tu nombre, correo electrónico, número de teléfono, negocio, interés en un servicio y mensaje.",
        "Cuando utilizas una cuenta, un proceso de pago o una reserva, podemos tratar la información necesaria para autenticarte, prestar el servicio, completar la transacción y atender solicitudes relacionadas.",
        "También podemos recibir información técnica básica de tu visita, como el navegador, el dispositivo y las páginas visitadas, según la configuración del sitio web y de sus servicios de soporte.",
      ]],
      ["Cómo utilizamos la información", [
        "Utilizamos la información para responder consultas, preparar propuestas, prestar servicios, procesar compras, gestionar reservas, mantener la seguridad y mejorar la experiencia pública de Ideas Estudio.",
        "No vendemos información personal. No utilizamos la integración de Meta para publicar contenido ni solicitamos permisos de Meta que no estén respaldados por una función demostrable.",
      ]],
      ["Datos de la Plataforma de Meta", [
        "Si conectas una Page de Facebook, el flujo de autorización puede permitirnos identificar las Pages que administras y leer las publicaciones públicas de la Page seleccionada. Estas capacidades corresponden a pages_show_list y pages_read_engagement.",
        "Los tokens de acceso de Meta se reciben y almacenan únicamente en el backend protegido. No se muestran en el sitio web público ni se envían al navegador como parte de la interfaz.",
        "Puedes desconectar la integración o solicitar la eliminación de los datos asociados comunicándote con nosotros mediante el canal indicado a continuación.",
      ]],
      ["Proveedores tecnológicos", [
        "El sitio web público se sirve mediante Vercel. La aplicación puede utilizar Supabase para servicios de datos, autenticación o almacenamiento, y Render para servicios de backend. Estos proveedores suministran infraestructura según los servicios utilizados por la aplicación.",
        "Vercel no se presenta como procesador de datos de Meta. Los tokens y credenciales de Meta no se incluyen en los recursos públicos del frontend.",
      ]],
      ["Conservación y solicitudes", [
        "Conservamos la información durante el tiempo razonablemente necesario para el propósito para el que fue recibida, la relación comercial, las obligaciones aplicables y la resolución de disputas. El período específico puede depender de la información y de la relación correspondiente.",
        "Puedes solicitar acceso, corrección o eliminación comunicándote con nosotros. Podemos pedir información razonable para verificar tu identidad y proteger la cuenta.",
      ]],
    ],
  },
  terms: {
    canonicalPath: "terms",
    title: "Términos y Condiciones",
    description: "Condiciones generales para utilizar el sitio web público y contratar los servicios de Ideas Estudio.",
    eyebrow: "Condiciones de uso",
    intro: "Al utilizar este sitio web o solicitar servicios de Ideas Estudio, aceptas utilizarlo de manera lícita, respetuosa y conforme a estas condiciones.",
    sections: [
      ["Contenido y servicios", [
        "El sitio web presenta información sobre servicios creativos, contenido, fotografía, video, branding, presencia digital y otras soluciones de Ideas Estudio. La disponibilidad, el alcance, el precio y el calendario de un servicio se confirman en la propuesta o acuerdo correspondiente.",
        "El contenido público puede cambiar para reflejar actualizaciones de servicios, procesos, precios, disponibilidad o información operativa.",
      ]],
      ["Solicitudes, compras y reservas", [
        "Enviar un formulario, iniciar un pago o solicitar una propuesta no garantiza por sí solo la aceptación de un trabajo. La relación de servicio se confirma cuando Ideas Estudio acepta la solicitud y se acuerdan sus condiciones.",
        "Debes proporcionar información exacta y mantener segura cualquier cuenta utilizada en el sitio web. No debes utilizar el sitio para fraude, abuso, acceso no autorizado ni contenido malicioso.",
      ]],
      ["Integraciones de terceros", [
        "Cuando conectas una Page de Facebook, autorizas únicamente las funciones mostradas en el flujo de Meta. La integración demostrable actualmente permite seleccionar una Page y leer las publicaciones públicas de la Page seleccionada.",
        "Ideas Estudio no afirma que este sitio publique contenido, cambie metadatos de una Page o muestre Meta Insights. Esas funciones están fuera del alcance actual de la integración.",
      ]],
      ["Propiedad intelectual", [
        "El nombre, la identidad, el diseño, los textos, las fotografías, los gráficos y demás contenido de este sitio pertenecen a Ideas Estudio o se utilizan con autorización. No puedes copiar, redistribuir, modificar ni explotar ese contenido sin permiso, salvo cuando la ley aplicable lo permita.",
      ]],
      ["Contacto", [
        "Puedes enviar preguntas sobre estos términos al correo indicado a continuación. Las condiciones de un proyecto, compra o reserva pueden complementar estos términos mediante una propuesta, contrato o confirmación del servicio.",
      ]],
    ],
  },
  deletion: {
    canonicalPath: "data-deletion",
    title: "Eliminación de Datos",
    description: "Solicita la eliminación de información personal o de la conexión de Meta asociada con Ideas Estudio.",
    eyebrow: "Tus datos",
    intro: "Puedes solicitar la eliminación de información personal o de datos asociados con una conexión de Meta. Esta página describe el canal público para iniciar la solicitud.",
    sections: [
      ["Cómo solicitar la eliminación", [
        `Escribe a ${SITE_CONTACT.email} desde una dirección que permita identificar razonablemente la solicitud. Incluye tu nombre, el correo utilizado y, si corresponde, el nombre de la Page o la cuenta de Ideas Estudio involucrada.`,
        "No incluyas contraseñas, tokens de acceso, App Secrets ni credenciales en el mensaje. Nunca necesitamos que envíes un token de Meta por correo.",
      ]],
      ["Qué puede eliminarse", [
        "Según la solicitud, podemos eliminar la asociación con la Page, eliminar la conexión de Meta, eliminar los tokens almacenados para esa conexión y eliminar los datos públicos asociados que ya no sean necesarios para el servicio.",
        "La eliminación puede limitarse cuando la información deba conservarse para cumplir una obligación legal, resolver una disputa, prevenir fraude o documentar una transacción. Explicaremos cualquier limitación aplicable.",
      ]],
      ["Verificación y respuesta", [
        "Podemos solicitar información razonable para confirmar que la solicitud proviene de la persona o entidad cuyos datos están involucrados. Después de verificarla, revisaremos el alcance y confirmaremos la acción realizada o el motivo de cualquier limitación.",
      ]],
      ["Conexiones de Meta", [
        "También puedes revocar el acceso desde la configuración de tu cuenta de Facebook. La revocación en Meta y la solicitud de eliminación a Ideas Estudio son acciones relacionadas, pero pueden requerir pasos separados.",
      ]],
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const pageKey = pathname.endsWith("/terms")
    ? "terms"
    : pathname.endsWith("/data-deletion")
      ? "deletion"
      : "privacy";
  const page = LEGAL_PAGES[pageKey];

  return (
    <>
      <SEOHead
        title={page.title}
        description={page.description}
        canonical={`${PUBLIC_ORIGIN}/${page.canonicalPath}`}
      />
      <main className="legal-page">
        <section className="page-hero legal-page__hero">
          <div className="container page-hero__inner">
            <span className="eyebrow">{page.eyebrow}</span>
            <h1 className="page-title">{page.title}</h1>
            <p className="page-subtitle">{page.intro}</p>
            <p className="legal-page__updated">Responsable del tratamiento: {CONTROLLER_NAME} · Fecha de vigencia: 20 de agosto de 2026</p>
          </div>
        </section>

        <section className="section legal-page__body">
          <div className="container legal-page__layout">
            <aside className="legal-page__aside" aria-label="Páginas legales">
              <span className="eyebrow">{BRAND_NAME}</span>
              <nav className="legal-page__nav">
                <Link to="/privacy-policy">Política de Privacidad</Link>
                <Link to="/terms">Términos y Condiciones</Link>
                <Link to="/data-deletion">Eliminación de Datos</Link>
              </nav>
              <div className="legal-page__contact">
                <strong>¿Preguntas?</strong>
                <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
                <a href={SITE_CONTACT.phone.href}>{SITE_CONTACT.phone.display}</a>
              </div>
            </aside>

            <div className="legal-page__content">
              {page.sections.map(([title, paragraphs]) => (
                <article className="legal-page__section" key={title}>
                  <h2>{title}</h2>
                  {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
