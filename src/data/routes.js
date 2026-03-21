export const clientRoutes = [
  {
    key: "small_business",
    path: "/pequenos-negocios",
    label: "Pequenos Negocios",
    tone: "business",
    shortText:
      "Para tiendas, restaurantes y servicios locales que necesitan verse mas profesionales y vender mejor.",
    heroTitle: "Haz que tu negocio se vea tan solido como lo que ofreces",
    heroSubtitle:
      "Contenido visual, branding y presencia digital para negocios que necesitan una imagen consistente y una experiencia publica que convierta.",
    intro:
      "Esta ruta esta pensada para negocios locales que necesitan presentacion visual, catalogo claro y una estructura lista para ordenar su operacion.",
    audience: [
      "Tiendas y boutiques",
      "Restaurantes y cafeterias",
      "Negocios de servicios",
      "Espacios fisicos con presencia local",
    ],
    painPoints: [
      "La imagen actual no refleja la calidad del negocio",
      "Faltan fotos profesionales de producto o espacio",
      "La comunicacion digital se siente improvisada",
      "No existe una estructura clara para vender online",
    ],
    packageIdeas: [
      {
        name: "Presencia inicial",
        description: "Base visual para ordenar la marca y empezar a proyectarse mejor.",
      },
      {
        name: "Catalogo visible",
        description: "Contenido y estructura para presentar servicios o productos con mas claridad.",
      },
      {
        name: "Negocio digital",
        description: "Web, contenido y flujo comercial listo para captar clientes.",
      },
    ],
  },
  {
    key: "entrepreneur",
    path: "/emprendedores",
    label: "Emprendedores",
    tone: "entrepreneur",
    shortText:
      "Para marcas personales, consultores y creadores que necesitan verse claros, memorables y listos para vender.",
    heroTitle: "Tu marca personal tambien necesita estructura visual y comercial",
    heroSubtitle:
      "Branding, fotografia y presencia digital para emprendedores que quieren presentar mejor su propuesta y crecer con criterio.",
    intro:
      "Aqui la experiencia se centra en diferenciar tu marca, ordenar tu narrativa y prepararte para vender servicios o productos propios.",
    audience: [
      "Consultores y coaches",
      "Artistas y creadores",
      "Marcas personales",
      "Profesionales independientes",
    ],
    painPoints: [
      "La marca no comunica con suficiente claridad",
      "Las redes se sienten dispersas o inconsistentes",
      "No existe una identidad visual fuerte",
      "Falta un sistema para captar oportunidades con orden",
    ],
    packageIdeas: [
      {
        name: "Marca inicial",
        description: "Punto de partida para ordenar presencia, fotos y narrativa.",
      },
      {
        name: "Marca visible",
        description: "Refuerzo visual y contenido para proyectarte mejor.",
      },
      {
        name: "Marca digital",
        description: "Sistema visual con web y experiencia publica mas completa.",
      },
    ],
  },
  {
    key: "emerging_business",
    path: "/empresas-emergentes",
    label: "Empresas Emergentes",
    tone: "emerging",
    shortText:
      "Para startups y marcas nuevas que necesitan salir al mercado con una imagen seria y una base digital escalable.",
    heroTitle: "Lanza tu proyecto con una presencia lista para competir",
    heroSubtitle:
      "Identidad, contenido y presencia digital para marcas que estan en validacion, lanzamiento o crecimiento temprano.",
    intro:
      "Esta ruta prioriza credibilidad, narrativa de lanzamiento y piezas publicas que ayuden a presentar el proyecto con mas fuerza.",
    audience: [
      "Startups",
      "Marcas nuevas",
      "Empresas en validacion",
      "Proyectos que necesitan presentacion para inversion o ventas",
    ],
    painPoints: [
      "La marca todavia no se percibe suficientemente solida",
      "Faltan materiales para presentar el proyecto correctamente",
      "La web no esta preparada para convertir interes en accion",
      "Hace falta una presencia mas estrategica para crecer",
    ],
    packageIdeas: [
      {
        name: "Lanzamiento visual",
        description: "Base de identidad y piezas para salir al mercado con mas claridad.",
      },
      {
        name: "Marca en crecimiento",
        description: "Contenido, materiales y estructura para consolidarse.",
      },
      {
        name: "Presencia digital completa",
        description: "Sistema de marca y captacion listo para escalar despues.",
      },
    ],
  },
  {
    key: "weddings_events_sessions",
    path: "/bodas-eventos-sesiones",
    label: "Bodas, Eventos y Sesiones",
    tone: "weddings",
    shortText:
      "Para clientes que buscan fotografia profesional con una experiencia cuidada, clara y facil de reservar.",
    heroTitle: "Momentos importantes merecen una experiencia visual a la altura",
    heroSubtitle:
      "Coberturas, sesiones y fotografia para bodas, celebraciones y retratos con un proceso claro desde la reserva hasta la entrega.",
    intro:
      "Esta ruta esta pensada para clientes finales que valoran sensibilidad visual, confianza en el proceso y claridad en la reserva.",
    audience: [
      "Bodas",
      "Eventos y celebraciones",
      "Sesiones en estudio o exterior",
      "Retratos y pareja",
    ],
    painPoints: [
      "Se busca una experiencia mas humana que solo una sesion tecnica",
      "Hace falta claridad sobre precios, reserva y disponibilidad",
      "El resultado final debe sentirse profesional y emotivo",
      "La persona quiere confianza total antes de reservar",
    ],
    packageIdeas: [
      {
        name: "Sesion esencial",
        description: "Ideal para retratos, pareja o sesiones breves con alto cuidado visual.",
      },
      {
        name: "Momento especial",
        description: "Cobertura pensada para celebraciones y eventos mas contenidos.",
      },
      {
        name: "Cobertura premium",
        description: "Ruta de mayor valor para bodas y experiencias emocionales completas.",
      },
    ],
  },
];

export function getClientRouteByKey(routeKey) {
  return clientRoutes.find((route) => route.key === routeKey) || null;
}
