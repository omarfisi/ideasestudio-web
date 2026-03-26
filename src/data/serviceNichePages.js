export const serviceNichePages = [
  {
    slug: "marca-o-negocio",
    tone: "business",
    title: "Tengo una marca o negocio",
    eyebrow: "Servicios especializados",
    heroTitle: "Soluciones para marcas y negocios que necesitan crecer con claridad",
    heroSubtitle:
      "Una base especializada para branding, contenido, web y redes, pensada para negocios que necesitan verse mejor y comunicar con más intención.",
    intro:
      "Esta ruta funciona como punto de partida para organizar luego un catálogo más claro para marcas personales, pequeños negocios y propuestas comerciales.",
    audience: [
      "Marcas nuevas que necesitan estructura visual",
      "Negocios que quieren verse más profesionales",
      "Proyectos que necesitan web, contenido o presencia digital",
      "Emprendimientos que quieren comunicar con más coherencia",
    ],
    priorities: [
      "Definir identidad y dirección visual",
      "Crear piezas para redes, web y presentación comercial",
      "Ordenar la comunicación de la marca",
      "Preparar una presencia digital más sólida",
    ],
    catalogPreview: [
      {
        title: "Branding y dirección visual",
        description: "Servicios que luego podrán agrupar identidad, sistema visual y lineamientos de marca.",
      },
      {
        title: "Contenido y presencia digital",
        description: "Espacio para fotografía, video, redes y piezas publicitarias orientadas a crecimiento.",
      },
      {
        title: "Web y soporte comercial",
        description: "Bloque futuro para páginas, catálogos y activos digitales conectados a venta o captación.",
      },
    ],
  },
  {
    slug: "presencia-visual-profesional",
    tone: "professional",
    title: "Necesito presencia visual profesional",
    eyebrow: "Servicios especializados",
    heroTitle: "Presencia visual profesional para empresas y equipos que necesitan proyectar confianza",
    heroSubtitle:
      "Una estructura base para imagen corporativa, fotografía y video empresarial con enfoque claro, sobrio y bien presentado.",
    intro:
      "Esta ruta organiza el tipo de servicios que luego podrás mostrar a empresas, organizaciones o equipos que necesitan verse consistentes y creíbles.",
    audience: [
      "Empresas con necesidad de imagen corporativa",
      "Equipos que requieren fotografía profesional",
      "Marcas que necesitan piezas de presentación institucional",
      "Proyectos que buscan una presencia visual más seria y coherente",
    ],
    priorities: [
      "Elevar la percepción profesional del negocio",
      "Crear activos visuales para presentaciones y canales digitales",
      "Unificar tono, estilo e identidad en materiales clave",
      "Preparar imagen para clientes, aliados y oportunidades comerciales",
    ],
    catalogPreview: [
      {
        title: "Imagen corporativa",
        description: "Área base para retratos de equipo, headshots, branding empresarial y piezas institucionales.",
      },
      {
        title: "Foto y video profesional",
        description: "Bloque futuro para producción visual orientada a empresas, oficinas, servicios y procesos.",
      },
      {
        title: "Materiales de presentación",
        description: "Espacio para activos visuales pensados para web, decks, perfiles y presencia comercial.",
      },
    ],
  },
  {
    slug: "momento-especial",
    tone: "moments",
    title: "Quiero capturar un momento especial",
    eyebrow: "Servicios especializados",
    heroTitle: "Una ruta clara para momentos especiales, sesiones y eventos que merecen ser recordados",
    heroSubtitle:
      "Página base para organizar después coberturas, sesiones y propuestas visuales para bodas, cumpleaños y ocasiones personales.",
    intro:
      "Aquí luego podrás agrupar servicios más emocionales y experienciales, con una comunicación más cercana y una estructura clara para reservar.",
    audience: [
      "Personas que quieren documentar un momento importante",
      "Clientes que buscan sesiones personales o familiares",
      "Eventos íntimos o celebraciones especiales",
      "Bodas, cumpleaños y coberturas con valor emocional",
    ],
    priorities: [
      "Transmitir confianza antes de reservar",
      "Explicar de forma clara la experiencia y el proceso",
      "Organizar paquetes o coberturas por ocasión",
      "Presentar ejemplos de entrega y estilo visual",
    ],
    catalogPreview: [
      {
        title: "Sesiones y retratos",
        description: "Bloque futuro para sesiones personales, pareja, familia y contenido emocional más íntimo.",
      },
      {
        title: "Coberturas de eventos",
        description: "Espacio para organizar cumpleaños, celebraciones y momentos especiales con claridad de servicio.",
      },
      {
        title: "Bodas y experiencias premium",
        description: "Área lista para crecer hacia propuestas más completas, emocionales y de mayor valor.",
      },
    ],
  },
  {
    slug: "solucion-creativa",
    tone: "creative",
    title: "Busco una solución creativa a mi medida",
    eyebrow: "Servicios especializados",
    heroTitle: "Soluciones creativas a medida para proyectos que no encajan en una sola caja",
    heroSubtitle:
      "Página base para campañas, propuestas mixtas y proyectos personalizados donde la combinación de servicios importa más que una categoría cerrada.",
    intro:
      "Esta ruta sirve para estructurar más adelante servicios flexibles y proyectos especiales que mezclan producción, estrategia y ejecución visual.",
    audience: [
      "Clientes con ideas híbridas o no estandarizadas",
      "Proyectos que combinan branding, contenido y producción",
      "Campañas que necesitan una propuesta especial",
      "Necesidades que requieren una solución más consultiva y personalizada",
    ],
    priorities: [
      "Diagnosticar la necesidad antes de cotizar",
      "Combinar servicios sin perder coherencia",
      "Presentar rutas o paquetes personalizados",
      "Dar una salida clara a proyectos mixtos o especiales",
    ],
    catalogPreview: [
      {
        title: "Campañas y activaciones",
        description: "Espacio futuro para propuestas con concepto, piezas visuales y ejecución por fases.",
      },
      {
        title: "Proyectos mixtos",
        description: "Bloque pensado para combinar foto, video, diseño, web o producción según el caso.",
      },
      {
        title: "Propuestas personalizadas",
        description: "Área lista para crecer hacia experiencias consultivas o soluciones especiales a medida.",
      },
    ],
  },
];

export function getServiceNichePageBySlug(slug) {
  return serviceNichePages.find((item) => item.slug === slug) || null;
}
