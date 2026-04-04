export const servicesMock = [
  {
    id: 1,
    name: "Diseno de logotipo",
    slug: "diseno-de-logotipo",
    category: "branding_design",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 345.95,
    shortDescription:
      "Identidad inicial para marcas que necesitan verse mas serias y consistentes.",
    description:
      "Servicio ideal para proyectos que necesitan una primera base visual fuerte. Incluye exploracion creativa, direccion inicial y una entrega organizada para seguir construyendo la marca.",
    includes: [
      "Sesion de descubrimiento",
      "Direccion visual inicial",
      "Propuesta principal",
      "Revisiones acordadas",
      "Entrega final organizada",
    ],
    featured: true,
    status: "active",
    image: "Direccion visual y sistema de marca",
    gallery: ["Brief", "Moodboard", "Aplicaciones"],
    deliveryTime: "7 a 12 dias",
  },
  {
    id: 2,
    name: "Fotografia de estudio",
    slug: "fotografia-de-estudio",
    category: "photography",
    clientTypes: ["entrepreneur", "weddings_events_sessions"],
    saleType: "buy_now",
    price: 169.95,
    shortDescription:
      "Sesion controlada en estudio para retratos, contenido o marca personal.",
    description:
      "Perfecta para retratos, sesiones de marca personal y piezas promocionales con iluminacion cuidada. La experiencia se mantiene simple para facilitar compra directa.",
    includes: [
      "Planificacion breve",
      "Sesion en estudio",
      "Curaduria de imagenes",
      "Edicion base",
      "Entrega digital",
    ],
    featured: true,
    status: "active",
    image: "Retrato, marca personal y contenido",
    gallery: ["Retrato", "Marca personal", "Detalle"],
    deliveryTime: "3 a 5 dias",
  },
  {
    id: 3,
    name: "Fotografia exterior",
    slug: "fotografia-exterior",
    category: "photography",
    clientTypes: ["entrepreneur", "weddings_events_sessions"],
    saleType: "buy_now",
    price: 399.99,
    shortDescription:
      "Sesion en locacion con direccion visual y un look mas editorial.",
    description:
      "Ideal para retratos, pareja, graduacion o contenido de marca personal fuera del estudio. La sesion se reserva como producto cerrado con precio base visible.",
    includes: [
      "Planificacion de locacion",
      "Sesion en exterior",
      "Edicion curada",
      "Entrega digital",
    ],
    featured: true,
    status: "active",
    image: "Locacion, luz natural y direccion",
    gallery: ["Locacion", "Pareja", "Editorial"],
    deliveryTime: "5 a 7 dias",
  },
  {
    id: 4,
    name: "Fotografia love story",
    slug: "fotografia-love-story",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "buy_now",
    price: 399.99,
    shortDescription:
      "Sesion para parejas con enfoque narrativo, natural y emocional.",
    description:
      "Pensada para parejas que quieren una experiencia intima y un resultado con intencion visual. Funciona bien como producto de compra directa dentro del catalogo.",
    includes: [
      "Planificacion creativa",
      "Sesion para pareja",
      "Edicion final",
      "Galeria digital",
    ],
    featured: true,
    status: "active",
    image: "Sesion de pareja con narrativa visual",
    gallery: ["Love story", "Exterior", "Entrega"],
    deliveryTime: "5 a 7 dias",
  },
  {
    id: 5,
    name: "Cobertura fotografica de bodas",
    slug: "cobertura-fotografica-de-bodas",
    category: "photography",
    clientTypes: ["weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 999.95,
    shortDescription:
      "Cobertura profesional para bodas con reserva mediante deposito.",
    description:
      "Pensada para uno de los dias mas importantes de la pareja. El flujo ideal luego conectara disponibilidad, contrato, pago inicial y seguimiento desde el CRM.",
    includes: [
      "Consulta inicial",
      "Planificacion de cobertura",
      "Reserva con deposito",
      "Edicion final",
      "Entrega organizada",
    ],
    featured: true,
    status: "active",
    image: "Cobertura completa con reserva",
    gallery: ["Ceremonia", "Detalles", "Celebracion"],
    deliveryTime: "Segun fecha del evento",
  },
  {
    id: 6,
    name: "Cobertura de eventos",
    slug: "cobertura-de-eventos",
    category: "photography",
    clientTypes: ["small_business", "weddings_events_sessions"],
    saleType: "deposit_booking",
    price: 449.99,
    shortDescription:
      "Cobertura profesional de eventos sociales o corporativos con reserva previa.",
    description:
      "Captura momentos clave, detalles y ambiente general del evento. Queda lista para conectarse despues con disponibilidad y facturacion desde el CRM.",
    includes: [
      "Coordinacion previa",
      "Cobertura del evento",
      "Edicion",
      "Entrega digital",
    ],
    featured: false,
    status: "active",
    image: "Cobertura social o corporativa",
    gallery: ["Evento", "Cobertura", "Entrega"],
    deliveryTime: "5 a 10 dias",
  },
  {
    id: 7,
    name: "Fotografia de productos",
    slug: "fotografia-de-productos",
    category: "photography",
    clientTypes: ["small_business", "emerging_business"],
    saleType: "buy_now",
    price: 499.95,
    shortDescription:
      "Imagenes para catalogo, ecommerce y redes con enfoque comercial.",
    description:
      "Servicio para marcas que necesitan elevar la presentacion visual de sus productos y vender mejor en canales digitales.",
    includes: [
      "Planificacion visual",
      "Sesion de producto",
      "Edicion",
      "Entrega final",
    ],
    featured: true,
    status: "active",
    image: "Producto listo para ecommerce",
    gallery: ["Catalogo", "Packshot", "Detalle"],
    deliveryTime: "5 a 8 dias",
  },
  {
    id: 8,
    name: "Estrategia de contenido",
    slug: "estrategia-de-contenido",
    category: "marketing",
    clientTypes: ["small_business", "entrepreneur", "emerging_business"],
    saleType: "quote_only",
    price: 280,
    shortDescription:
      "Plan base para ordenar mensajes, formatos y calendario de publicacion.",
    description:
      "Ideal para marcas que necesitan claridad sobre que decir, como decirlo y como conectar la comunicacion con objetivos comerciales.",
    includes: [
      "Diagnostico",
      "Linea editorial base",
      "Calendario sugerido",
      "Recomendaciones de activacion",
    ],
    featured: false,
    status: "active",
    image: "Narrativa, ritmo y activacion",
    gallery: ["Diagnostico", "Plan", "Calendario"],
    deliveryTime: "5 a 10 dias",
  },
  {
    id: 9,
    name: "Gestion de redes sociales",
    slug: "gestion-de-redes-sociales",
    category: "social_media",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "quote_only",
    price: 450,
    shortDescription:
      "Acompanamiento mensual con foco en consistencia, tono y presentacion visual.",
    description:
      "Servicio recurrente para marcas que necesitan apoyo continuo en planificacion, piezas y gestion operativa de sus canales.",
    includes: [
      "Plan mensual",
      "Diseno de piezas",
      "Programacion sugerida",
      "Seguimiento basico",
    ],
    featured: true,
    status: "active",
    image: "Operacion mensual de contenido",
    gallery: ["Plan", "Feed", "Historias"],
    deliveryTime: "Mensual",
  },
  {
    id: 10,
    name: "Produccion de video basica",
    slug: "produccion-de-video-basica",
    category: "video",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "buy_now",
    price: 499.99,
    shortDescription:
      "Video corto para presentar servicios, productos o la propuesta de la marca.",
    description:
      "Pensado para piezas promocionales simples, contenido de lanzamiento o material para redes con una produccion cuidada y un alcance acotado.",
    includes: [
      "Guia de grabacion",
      "Produccion base",
      "Edicion",
      "Entrega final",
    ],
    featured: false,
    status: "active",
    image: "Video corto y directo para conversion",
    gallery: ["Rodaje", "Edicion", "Entrega"],
    deliveryTime: "7 a 12 dias",
  },
  {
    id: 11,
    name: "Produccion de video avanzada",
    slug: "produccion-de-video-avanzada",
    category: "video",
    clientTypes: ["small_business", "emerging_business"],
    saleType: "quote_only",
    price: 999.99,
    shortDescription:
      "Produccion audiovisual robusta para campanas, marca o lanzamientos.",
    description:
      "Pensada para proyectos con mas capas creativas, guion, locaciones o necesidades de mayor produccion y coordinacion.",
    includes: [
      "Concepto creativo",
      "Preproduccion",
      "Rodaje",
      "Edicion final",
    ],
    featured: false,
    status: "active",
    image: "Campana audiovisual con mas alcance",
    gallery: ["Concepto", "Rodaje", "Postproduccion"],
    deliveryTime: "10 a 20 dias",
  },
  {
    id: 12,
    name: "Sitio web base",
    slug: "sitio-web-base",
    category: "web",
    clientTypes: ["small_business", "entrepreneur"],
    saleType: "buy_now",
    price: 499.99,
    shortDescription:
      "Sitio inicial para presentar negocio, servicios, contacto y conversion.",
    description:
      "Ideal para marcas que necesitan una presencia digital clara y profesional con una estructura sencilla de publicar y mantener.",
    includes: [
      "Arquitectura base",
      "Diseno visual",
      "Secciones principales",
      "Formulario y publicacion",
    ],
    featured: true,
    status: "active",
    image: "Web inicial con estructura clara",
    gallery: ["Hero", "Secciones", "Responsive"],
    deliveryTime: "10 a 15 dias",
  },
  {
    id: 13,
    name: "Landing de lanzamiento",
    slug: "landing-de-lanzamiento",
    category: "web",
    clientTypes: ["emerging_business"],
    saleType: "buy_now",
    price: 699.99,
    shortDescription:
      "Pagina enfocada en captar interes para un producto, marca o lanzamiento.",
    description:
      "Pensada para presentar una propuesta concreta, explicar valor y convertir interes en contacto o accion medible.",
    includes: [
      "Arquitectura de landing",
      "Diseno orientado a conversion",
      "Copy base",
      "Formulario de captura",
    ],
    featured: true,
    status: "active",
    image: "Landing enfocada en conversion",
    gallery: ["Hero", "Bloques", "CTA"],
    deliveryTime: "10 a 15 dias",
  },
  {
    id: 14,
    name: "Branding estrategico",
    slug: "branding-estrategico",
    category: "branding_design",
    clientTypes: ["emerging_business"],
    saleType: "quote_only",
    price: 1299.99,
    shortDescription:
      "Sistema visual para marcas nuevas que necesitan salir al mercado con seriedad.",
    description:
      "Servicio para empresas emergentes que necesitan direccion visual, identidad, tono y aplicaciones antes de escalar su presencia.",
    includes: [
      "Diagnostico",
      "Direccion de marca",
      "Sistema visual",
      "Aplicaciones principales",
    ],
    featured: true,
    status: "active",
    image: "Sistema completo de marca",
    gallery: ["Diagnostico", "Identidad", "Aplicaciones"],
    deliveryTime: "15 a 25 dias",
  },
];

const categoryLabels = {
  branding_design: "Branding y diseno",
  photography: "Fotografia",
  marketing: "Marketing",
  social_media: "Social media",
  video: "Video",
  web: "Web",
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
