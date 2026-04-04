export const servicesMock = [
  {
    id: 1,
    name: "Diseño de Logotipo",
    slug: "diseno-de-logotipo",
    category: "branding_design",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 345.95,
    shortDescription:
      "Diseño profesional de logotipo alineado a la esencia de la marca, con investigación creativa.",
    description:
      "Servicio ideal para marcas que necesitan una primera base visual fuerte. Incluye investigación creativa, exploración de concepto, propuesta de logotipo y entrega final organizada.",
    featured: true,
    status: "active",
    deliveryTime: "7 a 12 días",
  },
  {
    id: 2,
    name: "Diseño de Página Web Básica",
    slug: "diseno-de-pagina-web-basica",
    category: "web",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "buy_now",
    price: 499.99,
    shortDescription:
      "Desarrollo de una página web básica profesional para presentar tu negocio, servicios y contacto.",
    description:
      "Página web inicial con estructura clara, diseño alineado a la marca y secciones esenciales para captar nuevos clientes desde canales digitales.",
    featured: true,
    status: "active",
    deliveryTime: "10 a 15 días",
  },
  {
    id: 3,
    name: "Diseño de Tarjeta de Presentación",
    slug: "diseno-de-tarjeta-de-presentacion",
    category: "other",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "buy_now",
    price: 229.95,
    shortDescription:
      "Diseño de tarjetas de presentación profesionales alineadas a la identidad visual de la marca.",
    description:
      "Tarjetas diseñadas con criterio visual para representar bien a la marca en cada encuentro. Entrega lista para impresión en formatos estándar.",
    featured: false,
    status: "active",
    deliveryTime: "3 a 5 días",
  },
  {
    id: 4,
    name: "Estrategia de Contenido",
    slug: "estrategia-de-contenido",
    category: "marketing",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 99.99,
    shortDescription:
      "Plan y creación de contenido escrito para fortalecer la presencia digital y educar a la audiencia.",
    description:
      "Servicio ideal para marcas que necesitan claridad sobre qué decir y cómo decirlo. Incluye diagnóstico, línea editorial base y calendario de publicación.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 10 días",
  },
  {
    id: 5,
    name: "Fotografía de Estudio y Diseño para Montajes",
    slug: "fotografia-de-estudio-y-diseno-para-montajes",
    category: "photography",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "buy_now",
    price: 249.95,
    shortDescription:
      "Sesión fotográfica en estudio con diseño de montajes creativos para campañas y contenido digital.",
    description:
      "Ideal para marcas que necesitan material fotográfico trabajado con composición y diseño gráfico integrado. Entrega lista para publicar.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 8 días",
  },
  {
    id: 6,
    name: "Fotografía de Graduación Estudiantil",
    slug: "fotografia-graduacion-estudiantil",
    category: "photography",
    clientTypes: ["entrepreneur"],
    saleType: "buy_now",
    price: 45.0,
    shortDescription:
      "Retrato profesional de graduación para estudiantes con impresión incluida y entrega digital.",
    description:
      "Sesión diseñada para capturar el logro académico con calidad profesional. Incluye una imagen impresa y galería digital con edición base.",
    featured: false,
    status: "active",
    deliveryTime: "3 a 5 días",
  },
  {
    id: 7,
    name: "Fotografía Profesional de Bodas",
    slug: "fotografia-profesional-de-bodas",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 999.95,
    shortDescription:
      "Cobertura fotográfica profesional de bodas para documentar el gran día con imágenes que perduran.",
    description:
      "Pensada para uno de los días más importantes. Incluye consulta inicial, planificación de cobertura, edición profesional y entrega organizada en galería digital.",
    featured: true,
    status: "active",
    deliveryTime: "Según fecha del evento",
  },
  {
    id: 8,
    name: "Fotografía Profesional de Cumpleaños",
    slug: "fotografia-profesional-de-cumpleanos",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 399.99,
    shortDescription:
      "Cobertura fotográfica de cumpleaños para capturar momentos especiales, invitados y detalles del evento.",
    description:
      "Sesión diseñada para documentar celebraciones con enfoque emocional y atención a los detalles. Entrega digital con edición profesional.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 7 días",
  },
  {
    id: 9,
    name: "Fotografía Profesional de Embarazo",
    slug: "fotografia-profesional-de-embarazo",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "buy_now",
    price: 399.99,
    shortDescription:
      "Sesión fotográfica de embarazo enfocada en resaltar la belleza y emoción de esta etapa especial.",
    description:
      "Sesión emotiva y cuidada para documentar la maternidad antes del nacimiento. Incluye planificación, sesión completa, edición y galería digital.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 7 días",
  },
  {
    id: 10,
    name: "Fotografía Profesional de Estudio",
    slug: "fotografia-profesional-de-estudio",
    category: "photography",
    clientTypes: ["small_business", "emerging_business"],
    saleType: "buy_now",
    price: 169.95,
    shortDescription:
      "Sesión de estudio para retratos profesionales, personales o de marca con iluminación controlada.",
    description:
      "Perfecta para retratos corporativos, marca personal y piezas promocionales con iluminación cuidada en ambiente controlado. Entrega digital con edición base.",
    featured: true,
    status: "active",
    deliveryTime: "3 a 5 días",
  },
  {
    id: 11,
    name: "Fotografía Profesional de Eventos",
    slug: "fotografia-profesional-de-eventos",
    category: "photography",
    clientTypes: ["small_business", "emerging_business", "weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 449.99,
    shortDescription:
      "Cobertura fotográfica profesional de eventos corporativos o sociales con enfoque en momentos clave.",
    description:
      "Captura los momentos importantes, detalles y ambiente del evento con calidad profesional. Ideal para empresas y organizadores que necesitan material de alto impacto.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 10 días",
  },
  {
    id: 12,
    name: "Fotografía Profesional de Exterior",
    slug: "fotografia-profesional-de-exterior",
    category: "photography",
    clientTypes: ["entrepreneur", "weddings_events_sessions"],
    saleType: "buy_now",
    price: 399.99,
    shortDescription:
      "Sesión fotográfica en exteriores aprovechando luz natural y escenarios para un resultado editorial.",
    description:
      "Ideal para retratos, sesiones de pareja, graduación o contenido de marca personal fuera del estudio. Planificación de locación incluida.",
    featured: true,
    status: "active",
    deliveryTime: "5 a 7 días",
  },
  {
    id: 13,
    name: "Fotografía Profesional de Productos",
    slug: "fotografia-profesional-de-productos",
    category: "photography",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "buy_now",
    price: 499.95,
    shortDescription:
      "Sesiones fotográficas de productos para catálogos, e-commerce y redes con enfoque comercial.",
    description:
      "Servicio para marcas que necesitan elevar la presentación visual de sus productos y vender mejor en canales digitales. Planificación visual y edición incluidas.",
    featured: true,
    status: "active",
    deliveryTime: "5 a 8 días",
  },
  {
    id: 14,
    name: "Fotografía Profesional Love Story",
    slug: "fotografia-profesional-love-story",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "buy_now",
    price: 399.99,
    shortDescription:
      "Sesión fotográfica romántica para parejas tipo Love Story, ideal como recuerdo o ante de boda.",
    description:
      "Sesión pensada para parejas que quieren una experiencia íntima y un resultado con intención visual. Planificación creativa, edición final y galería digital.",
    featured: true,
    status: "active",
    deliveryTime: "5 a 7 días",
  },
  {
    id: 15,
    name: "Gestión de Redes Sociales",
    slug: "gestion-de-redes-sociales",
    category: "social_media",
    clientTypes: ["small_business", "emerging_business"],
    saleType: "quote_only",
    price: 99.99,
    shortDescription:
      "Gestión profesional de una plataforma de redes sociales con contenido constante y presencia activa.",
    description:
      "Acompañamiento mensual para marcas que necesitan apoyo continuo en planificación, piezas y gestión operativa de sus canales digitales.",
    featured: true,
    status: "active",
    deliveryTime: "Mensual",
  },
  {
    id: 16,
    name: "Gestión de Redes Sociales Estándar",
    slug: "gestion-de-redes-sociales-estandar",
    category: "social_media",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "quote_only",
    price: 299.99,
    shortDescription:
      "Impulsar la presencia digital de pequeños negocios y emprendedores con gestión mensual de contenido.",
    description:
      "Plan mensual completo para marcas que necesitan presencia activa en redes con consistencia visual, tono definido y publicaciones programadas.",
    featured: false,
    status: "active",
    deliveryTime: "Mensual",
  },
  {
    id: 17,
    name: "Materiales de Marketing",
    slug: "materiales-de-marketing",
    category: "marketing",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 299.99,
    shortDescription:
      "Diseño de materiales gráficos promocionales para campañas, productos y presentaciones de marca.",
    description:
      "Piezas gráficas diseñadas con criterio visual para apoyar lanzamientos, campañas y comunicación comercial. Entrega en formatos listos para impresión y digital.",
    featured: false,
    status: "active",
    deliveryTime: "5 a 10 días",
  },
  {
    id: 18,
    name: "Producción de Vídeos Avanzado",
    slug: "produccion-de-videos-avanzado",
    category: "video",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 999.99,
    shortDescription:
      "Producción de video avanzado de hasta 15 minutos con múltiples locaciones y postproducción completa.",
    description:
      "Para proyectos con más capas creativas, guion, locaciones y necesidades de mayor producción. Incluye concepto, preproducción, rodaje y edición final.",
    featured: false,
    status: "active",
    deliveryTime: "10 a 20 días",
  },
  {
    id: 19,
    name: "Producción de Vídeos Básico",
    slug: "produccion-de-videos-basico",
    category: "video",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "buy_now",
    price: 499.99,
    shortDescription:
      "Producción de un video básico de hasta 5 minutos para presentar servicios, productos o la marca.",
    description:
      "Pensado para piezas promocionales simples, contenido de lanzamiento o material para redes. Producción cuidada y entrega optimizada.",
    featured: false,
    status: "active",
    deliveryTime: "7 a 12 días",
  },
  {
    id: 20,
    name: "Producción de Vídeos Básico de Eventos",
    slug: "produccion-de-videos-basico-de-eventos",
    category: "video",
    clientTypes: ["small_business", "weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 499.99,
    shortDescription:
      "Cobertura en video profesional de eventos corporativos o sociales con entrega en formato optimizado.",
    description:
      "Servicio de video para eventos que necesitan cobertura profesional. Incluye grabación del evento, edición y entrega en formato digital.",
    featured: false,
    status: "active",
    deliveryTime: "7 a 10 días",
  },
];

const categoryLabels = {
  branding_design: "Branding y diseño",
  photography: "Fotografía",
  marketing: "Marketing",
  social_media: "Social media",
  video: "Video",
  web: "Web",
  other: "Otros",
};

const saleTypeLabels = {
  buy_now: "Compra directa",
  quote_only: "Solo cotizacion",
  deposit_booking: "Reserva con deposito",
};

const saleTypeCtas = {
  buy_now: "Comprar ahora",
  quote_only: "Solicitar propuesta",
  deposit_booking: "Reservar fecha",
};

const saleTypeModes = {
  buy_now: "buy",
  quote_only: "proposal",
  deposit_booking: "booking",
};

function getCurrentPageOrigin() {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

function buildServiceLeadQuery(service, options = {}) {
  const params = new URLSearchParams();
  const mode = options.mode || saleTypeModes[service.saleType] || "proposal";
  const pageOrigin = options.pageOrigin || getCurrentPageOrigin();
  const cta = options.cta || null;
  const clientType = options.clientType || null;

  if (service.name) params.set("service", service.name);
  if (service.slug) params.set("serviceSlug", service.slug);
  if (mode) params.set("mode", mode);
  if (pageOrigin) params.set("pageOrigin", pageOrigin);
  if (cta) params.set("cta", cta);
  if (clientType) params.set("clientType", clientType);

  return params.toString();
}

export function getServiceCategoryLabel(category) {
  return categoryLabels[category] || "Servicio";
}

export function getSaleTypeLabel(saleType) {
  return saleTypeLabels[saleType] || "Sin definir";
}

export function getSaleTypeCTA(saleType) {
  return saleTypeCtas[saleType] || "Ver servicio";
}

export function getServiceInquiryHref(service, options = {}) {
  const query = buildServiceLeadQuery(service, {
    ...options,
    mode: options.mode || saleTypeModes[service.saleType] || "proposal",
    cta: options.cta || "service_inquiry",
  });

  return `/servicios/checkout?${query}`;
}

export function getServiceActionHref(service, options = {}) {
  const mode = saleTypeModes[service.saleType] || "proposal";
  const query = buildServiceLeadQuery(service, {
    ...options,
    mode,
    cta: options.cta || "service_primary",
  });

  return `/servicios/checkout?${query}`;
}
