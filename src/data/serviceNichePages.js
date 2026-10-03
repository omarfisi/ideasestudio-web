import { getSegmentByKey } from "@/data/serviceSegmentsMap.js";
import { servicesMock } from "@/data/services.js";

const marcasNegociosSegment = getSegmentByKey("marcas_negocios");
const presenciaVisualSegment = getSegmentByKey("empresas_corporaciones");
const momentoEspecialSegment = getSegmentByKey("eventos");
const solucionCreativaSegment = getSegmentByKey("emprendedores");

const sharedSegmentSelector = {
  title: "Encuentra la propuesta ideal para tu marca, negocio o evento social.",
  titleBoxGlow: "propuesta",
  description:
    "Elige la dirección correcta para desarrollar tu marca, impulsar tu negocio o dar vida a un evento social especial.",
  items: [
    {
      title: "Emprendedores",
      description:
        "Para quienes quieren comenzar con claridad, construir su presencia y dar pasos firmes desde el inicio.",
      href: "/servicios/emprendedores",
    },
    {
      title: "Empresas y negocios",
      description:
        "Para negocios que necesitan orden, imagen y una estructura más sólida.",
      href: "/servicios/empresas-y-negocios",
    },
    {
      title: "Marcas",
      description:
        "Para marcas que buscan presencia, coherencia y conexión con su audiencia.",
      href: "/servicios/marcas",
    },
    {
      title: "Eventos sociales",
      description:
        "Para momentos que merecen verse bien y comunicarse con intención y emoción.",
      href: "/servicios/eventos-sociales",
    },
  ],
};

const mockBySlug = Object.fromEntries(
  servicesMock.map((s) => [s.slug, s])
);

const marcasNegociosServices = (marcasNegociosSegment?.services || []).map((item) => {
  const mock = item.serviceSlug ? mockBySlug[item.serviceSlug] : null;
  return {
    title: item.serviceTitle,
    slug: item.serviceSlug,
    description: mock?.shortDescription || item.notes || "",
    href: item.serviceSlug
      ? `/servicios/${item.serviceSlug}?mode=proposal&cta=segment_card&niche=marca-o-negocio`
      : `/contacto?mode=proposal&niche=marca-o-negocio`,
    ctaLabel: item.serviceSlug ? "Ver servicio" : "Hablar sobre esta idea",
  };
});

const presenciaVisualServices = (presenciaVisualSegment?.services || []).map((item) => {
  const mock = item.serviceSlug ? mockBySlug[item.serviceSlug] : null;

  return {
    title: item.serviceTitle,
    slug: item.serviceSlug,
    description: mock?.shortDescription || item.notes || "",
    href: item.serviceSlug
      ? `/servicios/${item.serviceSlug}?mode=proposal&cta=segment_card&niche=presencia-visual-profesional`
      : `/contacto?mode=proposal&niche=presencia-visual-profesional`,
    ctaLabel: item.serviceSlug ? "Ver servicio" : "Hablar sobre esta idea",
  };
});

const momentoEspecialServices = (momentoEspecialSegment?.services || []).map((item) => {
  const mock = item.serviceSlug ? mockBySlug[item.serviceSlug] : null;

  return {
    title: item.serviceTitle,
    slug: item.serviceSlug,
    description: mock?.shortDescription || item.notes || "",
    href: item.serviceSlug
      ? `/servicios/${item.serviceSlug}?mode=proposal&cta=segment_card&niche=momento-especial`
      : `/contacto?mode=proposal&niche=momento-especial`,
    ctaLabel: item.serviceSlug ? "Ver servicio" : "Hablar sobre esta idea",
  };
});

const solucionCreativaServices = (solucionCreativaSegment?.services || []).map((item) => {
  const mock = item.serviceSlug ? mockBySlug[item.serviceSlug] : null;

  return {
    title: item.serviceTitle,
    slug: item.serviceSlug,
    description: mock?.shortDescription || item.notes || "",
    href: item.serviceSlug
      ? `/servicios/${item.serviceSlug}?mode=proposal&cta=segment_card&niche=solucion-creativa`
      : `/contacto?mode=proposal&niche=solucion-creativa`,
    ctaLabel: item.serviceSlug ? "Ver servicio" : "Hablar sobre esta idea",
  };
});

const baseServiceNichePages = [
  {
    slug: "marca-o-negocio",
    tone: "business",
    segmentServices: marcasNegociosServices,
    title: "Tengo una marca o negocio",
    eyebrow: "Servicios especializados",
    heroTitle: "Soluciones para marcas y negocios que necesitan crecer con claridad.",
    heroTitleBoxGlow: "Soluciones",
    heroSubtitle:
      "Branding, contenido, web y activos comerciales para negocios que necesitan verse mejor, vender con mas orden y comunicar con mas intencion.",
    heroTags: [
      "Branding y direccion visual",
      "Contenido para redes",
      "Web y soporte comercial",
    ],
    heroPrimaryLabel: "Ver rutas principales",
    heroSecondaryLabel: "Compartir mi idea",
    heroSideLabels: {
      left: ["Marca y direccion visual", "Contenido que convierte"],
      right: ["Web con enfoque comercial", "Escala con coherencia"],
    },
    intro:
      "Este segmento organiza servicios pensados para marcas, negocios y proyectos que necesitan ordenar su presencia visual y convertir mejor.",
    orientation: {
      eyebrow: "Mapa del segmento",
      title:
        "Si tu marca necesita orden, presencia y una ruta clara para vender mejor, este segmento es para ti.",
      description:
        "Aqui agrupamos servicios para negocios que necesitan verse profesionales, comunicar con coherencia y crear piezas que realmente ayuden a vender.",
      outcomeLabel: "Lo que busca resolver",
      audienceTitle: "Quien suele entrar aqui",
      audienceItems: [
        "Marcas nuevas que necesitan una base visual clara",
        "Negocios que ya existen pero se ven inconsistentes",
        "Proyectos que necesitan web, redes y piezas comerciales conectadas",
      ],
      problemPoints: [
        "La marca no se entiende o se percibe improvisada.",
        "No hay una ruta clara entre presencia visual y conversion comercial.",
        "Las piezas existen, pero no trabajan juntas para crecer.",
      ],
      prioritiesTitle: "Lo que conviene resolver primero",
      prioritiesItems: [
        "Definir identidad, tono y direccion visual.",
        "Traducir esa direccion a contenido, web y piezas comerciales.",
        "Crear una presencia mas util para captar, presentar y vender.",
      ],
    },
    segmentSelector: sharedSegmentSelector,
    catalogSection: {
      eyebrow: "Servicios para esta ruta",
      title: "Elige el servicio ideal para hacer crecer tu marca o negocio.",
      titleBoxGlow: "ideal",
      subtitle:
        "Estos servicios están pensados para posicionar mejor tu marca, reforzar tu imagen y ayudarte a crecer con más claridad.",
    },
    catalogCards: (marcasNegociosSegment?.services || []).map((service, index) => ({
      eyebrow: `Servicio ${String(index + 1).padStart(2, "0")}`,
      title: service.serviceTitle,
      saleMode: service.serviceSlug ? "Cotizacion" : "Consulta",
      ctaLabel: service.serviceSlug
        ? `Cotizar ${service.serviceTitle}`
        : "Solicitar informacion",
    })),
    highlight: {
      railLabel: "Cómo suele moverse",
      railItems: [
        "Diagnóstico de marca y claridad de oferta",
        "Dirección visual y piezas base para comunicar",
        "Sistema de contenido, web o activos para conversión",
      ],
      eyebrow: "Bloque destacado",
      title: "La mejor versión de este segmento mezcla identidad, contenido y una salida comercial concreta.",
      description:
        "Cuando esta ruta funciona bien, la marca no solo se ve mejor: también se entiende mejor, comunica con más criterio y tiene piezas que ayudan a vender.",
      ctaLabel: "Quiero esta dirección",
      contestLabel: "Registrarme para concursos",
      accentLabel: "También suele mezclarse con",
      accentTitle: "Servicios complementarios que hacen más fuerte la propuesta",
      accentItems: (marcasNegociosSegment?.services || []).map((s) => s.serviceTitle),
      note:
        "Es una buena ruta para negocios que quieren dejar de improvisar su presencia y empezar a verse como una marca clara.",
    },
    supportSection: {
      eyebrow: "Apoyo comercial",
      title: "Lo que normalmente ayuda a cerrar mejor esta ruta",
      subtitle:
        "Estas pistas funcionan como ejemplos de combinaciones y decisiones utiles para convertir una necesidad difusa en una propuesta concreta.",
    },
    supportCards: [
      {
        eyebrow: "Si empiezas desde cero",
        title: "Primero se ordena la base de marca",
        description:
          "Cuando todavia no hay sistema visual claro, conviene empezar por identidad y luego bajar eso a contenido, web y piezas comerciales.",
      },
      {
        eyebrow: "Si ya tienes presencia",
        title: "Se corrige la incoherencia entre lo que haces y como te ves",
        description:
          "Muchos negocios ya publican o tienen pagina, pero no comunican bien su valor. Aqui se reordena esa capa visible.",
      },
      {
        eyebrow: "Resultado esperado",
        title: "Una marca mas clara, mas util y mas lista para vender",
        description:
          "La meta no es solo verte bonito, sino contar mejor lo que haces y facilitar la decision de quien te quiere contratar.",
      },
    ],
    cta: {
      title: "Transformemos esta necesidad en una propuesta clara para tu marca o negocio.",
      titleBoxGlow: "Transformemos",
      description:
        "Si ya identificaste lo que necesitas, te ayudamos a definir la combinación correcta entre branding, contenido, web y piezas comerciales.",
      primaryLabel: "Quiero una propuesta clara",
      secondaryLabel: "Ver todos los servicios",
      contestLabel: "Registrarme para concursos",
      contestNote: "Pronto aqui puedes activar concursos, sorteos, formularios y registros especiales.",
    },
  },
  {
    slug: "presencia-visual-profesional",
    tone: "professional",
    title: "Necesito presencia visual profesional",
    eyebrow: "Servicios especializados",
    heroTitle: "Presencia visual para empresas y equipos.",
    heroTitleBoxGlow: "Presencia",
    heroSubtitle:
      "Imagen corporativa, fotografia y video profesional para empresas, equipos y organizaciones que necesitan verse serios, consistentes y listos para presentar.",
    heroTags: [
      "Imagen corporativa",
      "Foto y video profesional",
      "Materiales de presentacion",
    ],
    heroPrimaryLabel: "Ver rutas principales",
    heroSecondaryLabel: "Compartir mi idea",
    heroSideLabels: {
      left: ["Imagen corporativa solida", "Retrato de equipo"],
      right: ["Foto y video institucional", "Materiales de presentacion"],
    },
    intro:
      "Este segmento organiza servicios para empresas y equipos que necesitan proyectar confianza con una presencia visual bien cuidada y util para sus canales.",
    orientation: {
      eyebrow: "Mapa del segmento",
      title:
        "Si tu empresa necesita verse mas creible, ordenada y presentable, esta es la ruta correcta.",
      description:
        "La meta aqui no es solo producir piezas bonitas, sino construir una presencia visual profesional que soporte reuniones, presentaciones, perfiles, sitio y materiales institucionales.",
      outcomeLabel: "Lo que busca resolver",
      audienceTitle: "Quien suele entrar aqui",
      audienceItems: [
        "Empresas que necesitan una imagen corporativa mas seria",
        "Equipos que requieren retratos, foto institucional o piezas de presentacion",
        "Organizaciones que necesitan video o visuales para procesos comerciales",
      ],
      problemPoints: [
        "La empresa no proyecta el nivel de confianza que realmente ofrece.",
        "Faltan activos visuales para presentarse bien frente a clientes o aliados.",
        "La imagen corporativa se siente dispersa entre canales y materiales.",
      ],
      prioritiesTitle: "Lo que conviene resolver primero",
      prioritiesItems: [
        "Definir la capa visual que mas expone a la empresa.",
        "Crear fotografia y video profesional alineados con el tono del negocio.",
        "Construir piezas que sirvan para web, decks, perfiles y ventas.",
      ],
    },
    segmentServices: presenciaVisualServices,
    segmentSelector: sharedSegmentSelector,
    catalogSection: {
      eyebrow: "Servicios para esta ruta",
      title: "Servicios enfocados en desarrollar una presencia visual profesional, clara y coherente.",
      titleBoxGlow: "desarrollar",
      subtitle:
        "Servicios diseñados para fortalecer tu imagen de marca, mejorar tu contenido y hacer más coherente tu presencia visual.",
    },
    catalogCards: [
      {
        eyebrow: "Ruta 01",
        title: "Headshots y retrato de equipo",
        description:
          "Ruta para empresas que necesitan mostrar lideres, equipos o portavoces con una imagen mas limpia, coherente y profesional.",
        saleMode: "Reserva",
        points: [
          "Ideal para web corporativa, LinkedIn, perfiles de equipo y presentaciones.",
          "Ayuda a elevar rapidamente la percepcion de seriedad del negocio.",
        ],
        ctaLabel: "Reservar una sesion",
      },
      {
        eyebrow: "Ruta 02",
        title: "Foto y video institucional",
        description:
          "Bloque pensado para oficinas, procesos, cultura de equipo, servicios y piezas visuales que expliquen mejor lo que hace la empresa.",
        saleMode: "Cotizacion",
        points: [
          "Sirve para sitio web, campañas, presentaciones y comunicacion externa.",
          "Puede combinar cobertura, retrato, espacios y contenido audiovisual.",
        ],
        ctaLabel: "Cotizar esta produccion",
      },
      {
        eyebrow: "Ruta 03",
        title: "Materiales de presentacion corporativa",
        description:
          "Ruta para traducir la imagen profesional en piezas que apoyen reuniones, propuestas, perfiles y visibilidad comercial.",
        saleMode: "Consulta",
        points: [
          "Ayuda a que la empresa se vea mejor en puntos clave de decision.",
          "Se combina bien con branding corporativo y activos institucionales.",
        ],
        ctaLabel: "Hablar de esta ruta",
      },
    ],
    highlight: {
      railLabel: "Cómo suele moverse",
      railItems: [
        "Definición de imagen y enfoque visual",
        "Producción de piezas y contenido para proyectar mejor",
        "Presentación digital más clara, sólida y profesional",
      ],
      eyebrow: "Bloque destacado",
      title:
        "La mejor versión de este segmento mezcla imagen, presentación y una presencia visual que se siente cuidada.",
      description:
        "Cuando esta ruta está bien trabajada, la presencia no solo se ve más bonita: también se percibe más profesional, más coherente y mejor pensada para generar confianza.",
      ctaLabel: "Quiero esta dirección",
      contestLabel: "Registrarme para concursos",
      accentLabel: "También suele mezclarse con",
      accentTitle:
        "Servicios complementarios que ayudan a elevar mejor la presentación",
      accentItems: (presenciaVisualSegment?.services || []).map((s) => s.serviceTitle),
      note:
        "Es una buena ruta para profesionales, marcas personales o proyectos que necesitan verse mejor para comunicar con más claridad y confianza.",
    },
    supportSection: {
      eyebrow: "Apoyo comercial",
      title: "Decisiones que hacen mas util esta ruta para una empresa",
      subtitle:
        "No todo entra al mismo tiempo. Estas pistas ayudan a priorizar mejor y evitar producir piezas sin una salida clara.",
    },
    supportCards: [
      {
        eyebrow: "Si vas a vender",
        title: "Conviene empezar por lo que mas ve un cliente o aliado",
        description:
          "Muchas veces la web, el perfil del equipo o la presentacion comercial tienen mas impacto inmediato que producir muchas piezas sin foco.",
      },
      {
        eyebrow: "Si el equipo crecio",
        title: "La imagen debe ponerse al dia con la escala real del negocio",
        description:
          "Cuando la empresa ya opera a otro nivel, su presencia visual tambien necesita reflejar orden, criterio y consistencia.",
      },
      {
        eyebrow: "Resultado esperado",
        title: "Una presencia mas creible en cada punto de contacto",
        description:
          "El objetivo es que la empresa se vea preparada para competir, presentar y cerrar mejor, no solo que tenga fotos nuevas.",
      },
    ],
    cta: {
      title: "Llevemos tu presencia visual a una propuesta clara y bien presentada.",
      titleBoxGlow: "presencia",
      description:
        "Si ya sabes que necesitas mejorar imagen, presentación o contenido visual, te ayudamos a organizar la combinación correcta para que todo se vea más profesional y coherente.",
      primaryLabel: "Quiero una propuesta clara",
      secondaryLabel: "Ver todos los servicios",
      contestLabel: "Registrarme para concursos",
    },
  },
  {
    slug: "momento-especial",
    tone: "moments",
    title: "Quiero capturar un momento especial",
    eyebrow: "Servicios especializados",
    heroTitle: "Haz de tus momentos especiales recuerdos que duren para siempre.",
    heroTitleBoxGlow: "momentos",
    heroSubtitle:
      "Bodas, sesiones, celebraciones y coberturas con una estructura mas clara para reservar, entender la experiencia y elegir mejor.",
    heroTags: [
      "Sesiones personales",
      "Coberturas de eventos",
      "Bodas y experiencias premium",
    ],
    heroPrimaryLabel: "Ver rutas principales",
    heroSecondaryLabel: "Compartir mi idea",
    heroSideLabels: {
      left: ["Sesiones personales", "Coberturas de eventos"],
      right: ["Bodas y experiencias", "Recuerdos con intencion"],
    },
    intro:
      "Este segmento organiza servicios para personas que quieren documentar un momento importante con claridad, sensibilidad y una experiencia bien presentada.",
    orientation: {
      eyebrow: "Mapa del segmento",
      title:
        "Si quieres guardar una etapa, una celebracion o una historia personal, aqui empieza la ruta correcta.",
      description:
        "La idea no es solo capturar imagenes, sino ayudarte a entender el tipo de experiencia, cobertura o sesion que mejor encaja con tu momento.",
      outcomeLabel: "Lo que busca resolver",
      audienceTitle: "Quien suele entrar aqui",
      audienceItems: [
        "Personas que quieren documentar una fecha importante",
        "Clientes que buscan una sesion personal, de pareja o familiar",
        "Eventos donde importa tanto el recuerdo como la experiencia",
      ],
      problemPoints: [
        "No siempre esta claro que tipo de sesion o cobertura conviene.",
        "La informacion suele ser generica y no ayuda a decidir con confianza.",
        "Hace falta una experiencia mas clara antes de reservar.",
      ],
      prioritiesTitle: "Lo que conviene resolver primero",
      prioritiesItems: [
        "Definir el tipo de experiencia o cobertura adecuada.",
        "Aclarar alcance, estilo y momentos clave de la entrega.",
        "Hacer facil reservar y avanzar con tranquilidad.",
      ],
    },
    segmentServices: momentoEspecialServices,
    segmentSelector: sharedSegmentSelector,
    catalogSection: {
      eyebrow: "Servicios para esta ruta",
      title: "Convierte una ocasión importante en una experiencia que se recuerde.",
      titleBoxGlow: "ocasión",
      subtitle:
        "Convierte tu evento en una experiencia que deje una huella.",
    },
    catalogCards: [
      {
        eyebrow: "Ruta 01",
        title: "Sesiones personales y familiares",
        description:
          "Ruta pensada para retratos, pareja, familia, maternidad o momentos personales donde importa la experiencia completa.",
        saleMode: "Reserva",
        points: [
          "Ideal para sesiones con direccion clara y un tono mas emocional.",
          "Ayuda a elegir mejor entre exterior, estudio o una propuesta mas intima.",
        ],
        ctaLabel: "Reservar esta sesion",
      },
      {
        eyebrow: "Ruta 02",
        title: "Coberturas de eventos y celebraciones",
        description:
          "Bloque para cumpleaños, graduaciones y celebraciones donde se necesita una cobertura clara, bien organizada y facil de entender.",
        saleMode: "Reserva",
        points: [
          "Funciona bien para eventos con tiempo, agenda y entregables definidos.",
          "Permite presentar opciones de cobertura segun el tipo de momento.",
        ],
        ctaLabel: "Consultar esta cobertura",
      },
      {
        eyebrow: "Ruta 03",
        title: "Bodas y experiencias premium",
        description:
          "Ruta para propuestas mas completas, con mayor preparacion, narrativa visual y una experiencia mas cuidada antes y durante el evento.",
        saleMode: "Cotizacion",
        points: [
          "Pensada para coberturas que requieren diagnostico, planificacion y detalle.",
          "Puede combinar fotografia, video y piezas previas o posteriores.",
        ],
        ctaLabel: "Solicitar propuesta",
      },
    ],
    highlight: {
      railLabel: "Cómo suele moverse",
      railItems: [
        "Definición de estilo y dirección visual del evento",
        "Piezas y contenido para comunicar con estética y coherencia",
        "Presentación final más cuidada, memorable y emocional",
      ],
      eyebrow: "Bloque destacado",
      title:
        "La mejor versión de este segmento mezcla estética, intención y una presentación que se siente especial de verdad.",
      description:
        "Cuando esta ruta se trabaja bien, el evento no solo se ve bonito: también se siente mejor pensado, mejor presentado y más alineado con la emoción que quieres transmitir.",
      ctaLabel: "Quiero esta dirección",
      contestLabel: "Registrarme para concursos",
      accentLabel: "También suele mezclarse con",
      accentTitle:
        "Servicios complementarios que ayudan a elevar la experiencia visual",
      accentItems: (momentoEspecialSegment?.services || []).map((s) => s.serviceTitle),
      note:
        "Es una buena ruta para celebraciones, actividades o momentos que necesitan una presentación visual más cuidada, emotiva y memorable.",
    },
    supportSection: {
      eyebrow: "Apoyo de la experiencia",
      title: "Informacion que ayuda a reservar con mas claridad",
      subtitle:
        "Estos bloques finales funcionan como guias utiles para resolver dudas frecuentes y dar una sensacion mas completa de experiencia.",
    },
    supportCards: [
      {
        eyebrow: "Antes de reservar",
        title: "Conviene explicar que tipo de cobertura o sesion necesita cada cliente",
        description:
          "No todos saben si necesitan una sesion, una cobertura breve o una propuesta mas completa. Aqui se orienta sin complicar.",
      },
      {
        eyebrow: "Para decidir mejor",
        title: "La experiencia importa tanto como las fotos",
        description:
          "Hablar de ritmo, acompanamiento, tiempos y estilo ayuda a que la propuesta se sienta mas humana y menos generica.",
      },
      {
        eyebrow: "Resultado esperado",
        title: "Una reserva mas clara y una experiencia mejor presentada",
        description:
          "La meta es que el cliente sienta confianza para avanzar porque entiende que se le ofrece y como se va a vivir.",
      },
    ],
    cta: {
      title: "Llevemos este momento especial a una propuesta clara y bien presentada.",
      titleBoxGlow: "Llevemos",
      description:
        "Si ya sabes que quieres cuidar mejor la imagen, la estética o la comunicación visual de tu evento, te ayudamos a organizar la combinación correcta para presentarlo con más intención.",
      primaryLabel: "Quiero una propuesta clara",
      secondaryLabel: "Ver todos los servicios",
      contestLabel: "Registrarme para concursos",
    },
  },
  {
    slug: "solucion-creativa",
    tone: "creative",
    title: "Busco una solución creativa a mi medida",
    eyebrow: "Servicios especializados",
    heroTitle: "Propuestas pensadas para proyectos que merecen una solución más personalizada.",
    heroTitleBoxGlow: "Propuestas",
    heroSubtitle:
      "Campañas, proyectos mixtos y propuestas personalizadas para necesidades donde branding, contenido, produccion o web deben mezclarse con criterio.",
    heroTags: [
      "Campañas y activaciones",
      "Proyectos mixtos",
      "Propuestas personalizadas",
    ],
    heroPrimaryLabel: "Ver rutas principales",
    heroSecondaryLabel: "Compartir mi idea",
    heroSideLabels: {
      left: ["Campañas y activaciones", "Proyectos mixtos"],
      right: ["Propuesta personalizada", "Ejecucion por fases"],
    },
    intro:
      "Este segmento agrupa ideas, campañas y necesidades que no caben en un servicio aislado y necesitan una propuesta mas consultiva.",
    orientation: {
      eyebrow: "Mapa del segmento",
      title:
        "Si tu proyecto mezcla varias necesidades y no encaja en una categoria cerrada, esta es la ruta correcta.",
      description:
        "Aqui organizamos proyectos donde hace falta combinar servicios, aterrizar una idea mas compleja y construir una solucion creativa a la medida.",
      outcomeLabel: "Lo que busca resolver",
      audienceTitle: "Quien suele entrar aqui",
      audienceItems: [
        "Clientes con campañas o ideas que mezclan varias disciplinas",
        "Proyectos que necesitan foto, video, diseno, web o estrategia en conjunto",
        "Necesidades que primero requieren diagnostico y luego una propuesta personalizada",
      ],
      problemPoints: [
        "La necesidad no cabe dentro de un servicio unico y estandar.",
        "Hace falta una mirada mas consultiva antes de cotizar.",
        "El proyecto requiere mezclar piezas sin perder foco ni coherencia.",
      ],
      prioritiesTitle: "Lo que conviene resolver primero",
      prioritiesItems: [
        "Entender la necesidad real detras del proyecto.",
        "Definir la mezcla correcta entre servicios, alcance y tiempos.",
        "Ordenar una propuesta clara antes de producir de mas o improvisar.",
      ],
    },
    segmentServices: solucionCreativaServices,
    segmentSelector: sharedSegmentSelector,
    catalogSection: {
      eyebrow: "Servicios para esta ruta",
      title: "Estrategías para desarrollar una solución creativa coherente con lo que tu proyecto necesita.",
      titleBoxGlow: "desarrollar",
      subtitle:
        "Estos servicios están pensados para proyectos que necesitan claridad creativa, contenido y una ejecución más coherente.",
    },
    catalogCards: [
      {
        eyebrow: "Ruta 01",
        title: "Campañas y activaciones",
        description:
          "Ruta para proyectos con concepto, piezas visuales y ejecucion por fases donde importa tanto la idea como la activacion.",
        saleMode: "Cotizacion",
        points: [
          "Ideal para lanzamientos, activaciones de marca o comunicaciones especiales.",
          "Puede mezclar estrategia, produccion y piezas para distintos canales.",
        ],
        ctaLabel: "Cotizar esta campana",
      },
      {
        eyebrow: "Ruta 02",
        title: "Proyectos mixtos por objetivos",
        description:
          "Bloque para clientes que necesitan combinar fotografia, video, diseno, web o contenido alrededor de un mismo objetivo.",
        saleMode: "Consulta",
        points: [
          "Conviene cuando la necesidad existe, pero todavia no esta traducida a una estructura clara.",
          "Permite definir que entra, que no entra y como se ordena la ejecucion.",
        ],
        ctaLabel: "Explorar esta mezcla",
      },
      {
        eyebrow: "Ruta 03",
        title: "Propuesta personalizada a la medida",
        description:
          "Ruta consultiva para necesidades especiales donde primero se diagnostica, luego se diseña la solucion y despues se cotiza con precision.",
        saleMode: "Cotizacion",
        points: [
          "Pensada para proyectos que requieren criterio, no solo una lista de servicios.",
          "Ayuda a convertir una idea difusa en una propuesta util y ejecutable.",
        ],
        ctaLabel: "Solicitar propuesta",
      },
    ],
    highlight: {
      railLabel: "Cómo suele moverse",
      railItems: [
        "Definición del enfoque creativo y concepto base",
        "Desarrollo de piezas, contenido o recursos visuales",
        "Presentación final más original, clara y funcional",
      ],
      eyebrow: "Bloque destacado",
      title:
        "La mejor versión de este segmento mezcla creatividad, dirección y una ejecución que se siente pensada de verdad.",
      description:
        "Cuando esta ruta se trabaja bien, la idea no solo se ve diferente: también se entiende mejor, conecta más y se convierte en una propuesta visual mucho más sólida.",
      ctaLabel: "Quiero esta dirección",
      contestLabel: "Registrarme para concursos",
      accentLabel: "También suele mezclarse con",
      accentTitle:
        "Servicios complementarios que ayudan a fortalecer mejor la propuesta",
      accentItems: (solucionCreativaSegment?.services || []).map((s) => s.serviceTitle),
      note:
        "Es una buena ruta para proyectos que necesitan una solución visual más creativa, más estratégica y mejor presentada.",
    },
    supportSection: {
      eyebrow: "Apoyo estrategico",
      title: "Bloques que ayudan a volver mas clara una solucion a medida",
      subtitle:
        "Estas referencias sirven para orientar la conversacion comercial y mostrar que una propuesta personalizada tambien puede presentarse con estructura.",
    },
    supportCards: [
      {
        eyebrow: "Cuando hay muchas ideas",
        title: "Primero se ordena el objetivo, luego se arma la mezcla",
        description:
          "No hace falta definir todos los entregables desde el inicio. Lo importante es detectar que mueve mas el proyecto y construir desde ahi.",
      },
      {
        eyebrow: "Cuando hay varias disciplinas",
        title: "La propuesta debe sentirse integrada, no como una suma de servicios sueltos",
        description:
          "Foto, video, branding, web o contenido deben responder al mismo enfoque para que la solucion realmente tenga valor.",
      },
      {
        eyebrow: "Resultado esperado",
        title: "Una propuesta especial, pero bien aterrizada",
        description:
          "La meta es que el cliente vea una ruta clara, personalizada y ejecutable, no un documento ambiguo lleno de posibilidades vacias.",
      },
    ],
    cta: {
      title: "Llevemos esta solución creativa a una propuesta clara y bien construida.",
      titleBoxGlow: "solución",
      description:
        "Si ya sabes que necesitas una dirección más creativa para tu proyecto, te ayudamos a organizar la combinación correcta de servicios para desarrollarla con claridad y coherencia.",
      primaryLabel: "Quiero una propuesta clara",
      secondaryLabel: "Ver todos los servicios",
      contestLabel: "Registrarme para concursos",
    },
  },
];

const LOCAL_SEGMENT_MEDIA = {
  "marca-o-negocio": {
    "heroImageUrl": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/blog-images/segments/hero/1444e6a7e5534efa887e4fb00c50a3cf.webp",
    "heroFocalX": 50.0,
    "heroFocalY": 50.0,
    "heroFitMode": "cover",
    "segmentServices": [
      {
        "title": "Diseño de Logotipo",
        "slug": "diseno-de-logotipo",
        "description": "Diseño profesional de logotipo alineado a la esencia de la marca, con investigación básica, propuestas creativas y entrega en formatos listos para impresión y uso digital.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/diseno-de-logotipo/covers/5f373287b9e24f3cb4fd4c31c0c04a40.webp",
        "href": "/servicios/diseno-de-logotipo?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Diseño de Página Web Básica",
        "slug": "diseno-de-pagina-web-basica",
        "description": "Desarrollo de una página web básica profesional para presentar negocio, servicios y contacto, con diseño responsive y estructura optimizada.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/diseno-de-pagina-web-basica/covers/cf3d1ba7cb5f4bf7a0ac5b2c6c6714a1.webp",
        "href": "/servicios/diseno-de-pagina-web-basica?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Gestión de Redes Sociales",
        "slug": "gestion-de-redes-sociales",
        "description": "Gestión profesional de una plataforma de redes sociales con contenido constante, diseño de piezas y seguimiento básico de comunidad.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/gestion-de-redes-sociales/covers/58eac0af17e348b5b0717c760910bc9c.webp",
        "href": "/servicios/gestion-de-redes-sociales?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Materiales de Marketing",
        "slug": "materiales-de-marketing",
        "description": "Diseño de materiales gráficos promocionales para campañas, productos o eventos específicos de la marca.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/materiales-de-marketing/covers/4d5a1f94a95844aab7d61d8160a98a47.webp",
        "href": "/servicios/materiales-de-marketing?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Estrategia de Contenido",
        "slug": "estrategia-de-contenido",
        "description": "Plan y creación de contenido escrito para fortalecer presencia digital, educar a la audiencia y apoyar objetivos comerciales.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/estrategia-de-contenido/covers/d15a5b7bb3144decb02aa608b03bea11.webp",
        "href": "/servicios/estrategia-de-contenido?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Diseño de Tarjeta de Presentación",
        "slug": "diseno-de-tarjeta-de-presentacion",
        "description": "Diseño de tarjetas de presentación profesionales alineadas a la identidad visual del negocio, listas para impresión y uso digital.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/diseno-de-tarjeta-de-presentacion/covers/03075df8f19c4addba2730cbc593ce5d.webp",
        "href": "/servicios/diseno-de-tarjeta-de-presentacion?mode=proposal&cta=segment_card&niche=marca-o-negocio",
        "ctaLabel": "Ver servicio"
      }
    ]
  },
  "presencia-visual-profesional": {
    "heroImageUrl": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/blog-images/segments/hero/9bc5e8b476eb4aedb24a4230865a6327.webp",
    "heroFocalX": 50.0,
    "heroFocalY": 50.0,
    "heroFitMode": "cover",
    "segmentServices": [
      {
        "title": "Fotografía Profesional de Estudio",
        "slug": "fotografia-profesional-de-estudio",
        "description": "Sesión de estudio para retratos profesionales, personales o corporativos con iluminación de calidad.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-estudio/covers/cab594e038cd42338b1d81470919ca17.webp",
        "href": "/servicios/fotografia-profesional-de-estudio?mode=proposal&cta=segment_card&niche=presencia-visual-profesional",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía y Video Corporativo",
        "slug": "fotografia-y-video-corporativo",
        "description": "",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-y-video-corporativo/covers/cf9e780a26324a65b62e5c666198fe4f.webp",
        "href": "/servicios/fotografia-y-video-corporativo?mode=proposal&cta=segment_card&niche=presencia-visual-profesional",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Exterior",
        "slug": "fotografia-profesional-de-exterior",
        "description": "Sesión fotográfica en exteriores aprovechando luz natural y escenarios atractivos.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-exterior/covers/b7261973d98a46bd9285a526c0036676.webp",
        "href": "/servicios/fotografia-profesional-de-exterior?mode=proposal&cta=segment_card&niche=presencia-visual-profesional",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Producción de Videos Avanzado",
        "slug": "produccion-de-videos-avanzado",
        "description": "Producción de video avanzado de hasta 15 minutos, con múltiples locaciones, testimonios, guion personalizado y enfoque en marketing.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/produccion-de-videos-avanzado/covers/83dab92225f14c51a816a6ea6eea1dca.webp",
        "href": "/servicios/produccion-de-videos-avanzado?mode=proposal&cta=segment_card&niche=presencia-visual-profesional",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Productos",
        "slug": "fotografia-profesional-de-productos",
        "description": "Sesiones fotográficas de productos para catálogos, e-commerce y redes sociales.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-productos/covers/1f4ea28659e14f94aa27f92ccca6d0ae.webp",
        "href": "/servicios/fotografia-profesional-de-productos?mode=proposal&cta=segment_card&niche=presencia-visual-profesional",
        "ctaLabel": "Ver servicio"
      }
    ]
  },
  "momento-especial": {
    "heroImageUrl": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/blog-images/segments/hero/29500dea69144ce59d72a418376ce595.webp",
    "heroFocalX": 50.0,
    "heroFocalY": 50.0,
    "heroFitMode": "cover",
    "segmentServices": [
      {
        "title": "Fotografía Profesional de Bodas",
        "slug": "fotografia-profesional-de-bodas",
        "description": "Cobertura fotográfica profesional de bodas para documentar el gran día con imágenes emotivas y de alta calidad.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-bodas/covers/1a17de3e3ba0452e83e197b936042e42.webp",
        "href": "/servicios/fotografia-profesional-de-bodas?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Embarazo",
        "slug": "fotografia-profesional-de-embarazo",
        "description": "Sesión fotográfica de embarazo enfocada en resaltar la belleza y emoción de esta etapa.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-embarazo/covers/4314488a81f8499a8269cfc5047f19ce.webp",
        "href": "/servicios/fotografia-profesional-de-embarazo?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional Love Story",
        "slug": "fotografia-profesional-love-story",
        "description": "Sesión fotográfica romántica para parejas tipo Love Story, ideal como recuerdo o pre-boda.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-love-story/covers/c0275559a9394d2abcc020246ccb5d86.webp",
        "href": "/servicios/fotografia-profesional-love-story?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Eventos",
        "slug": "fotografia-profesional-de-eventos",
        "description": "Cobertura fotográfica profesional de eventos corporativos o sociales con enfoque en momentos clave.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-eventos/covers/3556baf8b04145fc8be1e3cd1b06bdd6.webp",
        "href": "/servicios/fotografia-profesional-de-eventos?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Cumpleaños",
        "slug": "fotografia-profesional-de-cumpleanos",
        "description": "Cobertura fotográfica de cumpleaños para capturar momentos especiales, invitados y detalles de la celebración.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-cumpleanos/covers/434a19f02a9840f6b43fbf6895133d83.webp",
        "href": "/servicios/fotografia-profesional-de-cumpleanos?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Fotografía Profesional de Exterior",
        "slug": "fotografia-profesional-de-exterior",
        "description": "Sesión fotográfica en exteriores aprovechando luz natural y escenarios atractivos.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-profesional-de-exterior/covers/b7261973d98a46bd9285a526c0036676.webp",
        "href": "/servicios/fotografia-profesional-de-exterior?mode=proposal&cta=segment_card&niche=momento-especial",
        "ctaLabel": "Ver servicio"
      }
    ]
  },
  "solucion-creativa": {
    "heroImageUrl": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/blog-images/segments/hero/265d4cebd5b047769b1ee0bc8801931d.webp",
    "heroFocalX": 50.0,
    "heroFocalY": 50.0,
    "heroFitMode": "cover",
    "segmentServices": [
      {
        "title": "Fotografía de Estudio y Diseño para Montajes",
        "slug": "fotografia-de-estudio-y-diseno-para-montajes",
        "description": "Sesión fotográfica en estudio con diseño de montajes creativos para campañas y proyectos visuales.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/fotografia-de-estudio-y-diseno-para-montajes/covers/820c759dccfd4af3989b34f40a23a1f9.webp",
        "href": "/servicios/fotografia-de-estudio-y-diseno-para-montajes?mode=proposal&cta=segment_card&niche=solucion-creativa",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Diseño de Logotipo",
        "slug": "diseno-de-logotipo",
        "description": "Diseño profesional de logotipo alineado a la esencia de la marca, con investigación básica, propuestas creativas y entrega en formatos listos para impresión y uso digital.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/diseno-de-logotipo/covers/5f373287b9e24f3cb4fd4c31c0c04a40.webp",
        "href": "/servicios/diseno-de-logotipo?mode=proposal&cta=segment_card&niche=solucion-creativa",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Estrategia de Contenido",
        "slug": "estrategia-de-contenido",
        "description": "Plan y creación de contenido escrito para fortalecer presencia digital, educar a la audiencia y apoyar objetivos comerciales.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/estrategia-de-contenido/covers/d15a5b7bb3144decb02aa608b03bea11.webp",
        "href": "/servicios/estrategia-de-contenido?mode=proposal&cta=segment_card&niche=solucion-creativa",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Producción de Videos Avanzado",
        "slug": "produccion-de-videos-avanzado",
        "description": "Producción de video avanzado de hasta 15 minutos, con múltiples locaciones, testimonios, guion personalizado y enfoque en marketing.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/produccion-de-videos-avanzado/covers/83dab92225f14c51a816a6ea6eea1dca.webp",
        "href": "/servicios/produccion-de-videos-avanzado?mode=proposal&cta=segment_card&niche=solucion-creativa",
        "ctaLabel": "Ver servicio"
      },
      {
        "title": "Gestión de Redes Sociales Avanzada",
        "slug": "gestion-de-redes-sociales-avanzada",
        "description": "Impulsar la presencia digital de pequeños negocios, emprendedores y empresas establecidas, creando estrategias de contenido personalizadas que generen engagement, posicionamiento de marca y ventas.",
        "image": "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/gestion-de-redes-sociales-avanzada/covers/d12fda9ee4b34676bd23c29b8f95f0ec.webp",
        "href": "/servicios/gestion-de-redes-sociales-avanzada?mode=proposal&cta=segment_card&niche=solucion-creativa",
        "ctaLabel": "Ver servicio"
      }
    ]
  }
};

export const serviceNichePages = baseServiceNichePages.map((page) => {
  const media = LOCAL_SEGMENT_MEDIA[page.slug] || {};

  return {
    ...page,
    heroImageUrl: media.heroImageUrl || page.heroImageUrl,
    heroFocalX: media.heroFocalX ?? page.heroFocalX ?? 50,
    heroFocalY: media.heroFocalY ?? page.heroFocalY ?? 50,
    heroFitMode: media.heroFitMode || page.heroFitMode || "cover",
    segmentServices: media.segmentServices || page.segmentServices || [],
    catalogPreview: page.catalogCards.map((card) => ({
      title: card.title,
      description: card.description,
    })),
  };
});

export function getServiceNichePageBySlug(slug) {
  return serviceNichePages.find((item) => item.slug === slug) || null;
}
