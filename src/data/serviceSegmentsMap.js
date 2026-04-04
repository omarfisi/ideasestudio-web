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
        serviceSlug: "diseno-de-pagina-web-basica",
        notes: "",
      },
      {
        serviceTitle: "Diseño de Tarjeta de Presentación",
        serviceSlug: "diseno-de-tarjeta-de-presentacion",
        notes: "",
      },
      {
        serviceTitle: "Estrategia de Contenido",
        serviceSlug: "estrategia-de-contenido",
        notes: "",
      },
      {
        serviceTitle: "Gestión de Redes Sociales Estándar",
        serviceSlug: "gestion-de-redes-sociales-estandar",
        notes: "",
      },
      {
        serviceTitle: "Materiales de Marketing",
        serviceSlug: "materiales-de-marketing",
        notes: "",
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
        serviceTitle: "Gestión de Redes Sociales Estándar",
        serviceSlug: "gestion-de-redes-sociales-estandar",
        notes: "",
      },
      {
        serviceTitle: "Materiales de Marketing",
        serviceSlug: "materiales-de-marketing",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Productos",
        serviceSlug: "fotografia-profesional-de-productos",
        notes: "",
      },
      {
        serviceTitle: "Producción de Vídeos Básico",
        serviceSlug: "produccion-de-videos-basico",
        notes: "",
      },
      {
        serviceTitle: "Diseño de Página Web Básica",
        serviceSlug: "diseno-de-pagina-web-basica",
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
        serviceSlug: "materiales-de-marketing",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Estudio",
        serviceSlug: "fotografia-profesional-de-estudio",
        notes: "",
      },
      {
        serviceTitle: "Fotografía de Estudio y Diseño para Montajes",
        serviceSlug: "fotografia-de-estudio-y-diseno-para-montajes",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Eventos",
        serviceSlug: "fotografia-profesional-de-eventos",
        notes: "",
      },
      {
        serviceTitle: "Producción de Vídeos Avanzado",
        serviceSlug: "produccion-de-videos-avanzado",
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
        serviceSlug: "fotografia-profesional-de-bodas",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Cumpleaños",
        serviceSlug: "fotografia-profesional-de-cumpleanos",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Embarazo",
        serviceSlug: "fotografia-profesional-de-embarazo",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Eventos",
        serviceSlug: "fotografia-profesional-de-eventos",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional de Exterior",
        serviceSlug: "fotografia-profesional-de-exterior",
        notes: "",
      },
      {
        serviceTitle: "Fotografía Profesional Love Story",
        serviceSlug: "fotografia-profesional-love-story",
        notes: "",
      },
      {
        serviceTitle: "Fotografía de Graduación Estudiantil",
        serviceSlug: "fotografia-graduacion-estudiantil",
        notes: "",
      },
      {
        serviceTitle: "Producción de Vídeos Básico de Eventos",
        serviceSlug: "produccion-de-videos-basico-de-eventos",
        notes: "",
      },
    ],
  },
];

/** Retorna el segmento por key */
export function getSegmentByKey(key) {
  return SERVICE_SEGMENTS_MAP.find((s) => s.key === key) ?? null;
}
