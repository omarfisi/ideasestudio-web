/**
 * Fuente de verdad visual para los 4 segmentos comerciales.
 * Usada para alimentar páginas de segmento, filtros y navegación.
 *
 * Segmentos oficiales:
 *   emprendedores | marcas_negocios | empresas_corporaciones | eventos
 *
 * Estructura de cada servicio:
 *   serviceTitle  → nombre visible
 *   serviceSlug   → slug real del servicio (null si no está confirmado)
 *   notes         → contexto o aclaración (opcional)
 */

export const SERVICE_SEGMENTS_MAP = [
  {
    key: "emprendedores",
    label: "Emprendedores",
    shortLabel: "Emprendedores",
    description:
      "Servicios para comenzar con una presencia clara y profesional.",
    services: [
      {
        serviceTitle: "Diseño de Logotipo",
        serviceSlug: "diseno-de-logotipo",
        notes: "",
      },
      {
        serviceTitle: "Diseño de Página Web Básica",
        serviceSlug: "sitio-web-base",
        notes: "",
      },
      {
        serviceTitle: "Diseño de Tarjeta de Presentación",
        serviceSlug: null,
        notes: "Sin slug confirmado en la data actual.",
      },
      {
        serviceTitle: "Estrategia de Contenido",
        serviceSlug: "estrategia-de-contenido",
        notes: "",
      },
      {
        serviceTitle: "Materiales de Marketing",
        serviceSlug: null,
        notes: "Sin slug confirmado en la data actual.",
      },
    ],
  },
  {
    key: "marcas_negocios",
    label: "Marcas y Negocios",
    shortLabel: "Marcas",
    description:
      "Servicios para negocios activos que quieren crecer o verse mejor.",
    services: [
      {
        serviceTitle: "Diseño de Logotipo",
        serviceSlug: "diseno-de-logotipo",
        notes: "",
      },
      {
        serviceTitle: "Branding Estratégico",
        serviceSlug: "branding-estrategico",
        notes: "",
      },
      {
        serviceTitle: "Estrategia de Contenido",
        serviceSlug: "estrategia-de-contenido",
        notes: "",
      },
      {
        serviceTitle: "Gestión de Redes Sociales",
        serviceSlug: "gestion-de-redes-sociales",
        notes: "",
      },
      {
        serviceTitle: "Materiales de Marketing",
        serviceSlug: null,
        notes: "Sin slug confirmado en la data actual.",
      },
      {
        serviceTitle: "Fotografía Profesional de Productos",
        serviceSlug: "fotografia-de-productos",
        notes: "",
      },
      {
        serviceTitle: "Producción de Videos Básico",
        serviceSlug: "produccion-de-video-basica",
        notes: "",
      },
      {
        serviceTitle: "Diseño de Página Web Básica",
        serviceSlug: "sitio-web-base",
        notes: "",
      },
    ],
  },
  {
    key: "empresas_corporaciones",
    label: "Empresas y Corporaciones",
    shortLabel: "Empresas",
    description:
      "Servicios para imagen institucional, corporativa y comunicación estructurada.",
    services: [
      {
        serviceTitle: "Estrategia de Contenido",
        serviceSlug: "estrategia-de-contenido",
        notes: "",
      },
      {
        serviceTitle: "Gestión de Redes Sociales",
        serviceSlug: "gestion-de-redes-sociales",
        notes: "",
      },
      {
        serviceTitle: "Materiales de Marketing",
        serviceSlug: null,
        notes: "Sin slug confirmado en la data actual.",
      },
      {
        serviceTitle: "Producción de Videos Avanzado",
        serviceSlug: "produccion-de-video-avanzada",
        notes: "",
      },
      {
        serviceTitle: "Fotografía de Estudio y Diseño para Montajes",
        serviceSlug: "fotografia-de-estudio",
        notes: "",
      },
    ],
  },
  {
    key: "eventos",
    label: "Eventos",
    shortLabel: "Eventos",
    description:
      "Servicios para cobertura, recuerdos y momentos importantes.",
    services: [
      {
        serviceTitle: "Fotografía Profesional de Bodas",
        serviceSlug: "cobertura-fotografica-de-bodas",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Cumpleaños",
        serviceSlug: null,
        notes: "Sin slug confirmado — posible alias de cobertura-de-eventos.",
      },
      {
        serviceTitle: "Fotografía Profesional de Embarazo",
        serviceSlug: null,
        notes: "Sin slug confirmado en la data actual.",
      },
      {
        serviceTitle: "Fotografía Profesional de Eventos",
        serviceSlug: "cobertura-de-eventos",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Exterior",
        serviceSlug: "fotografia-exterior",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional Love Story",
        serviceSlug: "fotografia-love-story",
        notes: "",
      },
      {
        serviceTitle: "Producción de Videos Básico de Eventos",
        serviceSlug: "produccion-de-video-basica",
        notes: "Mismo slug base — contexto de eventos.",
      },
    ],
  },
];

/** Retorna el segmento por key */
export function getSegmentByKey(key) {
  return SERVICE_SEGMENTS_MAP.find((s) => s.key === key) ?? null;
}
