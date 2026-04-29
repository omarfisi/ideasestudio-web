export const SUBCAT_LABELS = {
  embarazo: "Fotografía de embarazo",
  boda: "Fotografía de boda",
  love_story: "Love Story",
  cumpleanos: "Fotografía de cumpleaños",
  graduacion: "Fotografía de graduación",
  evento: "Fotografía de evento",
  exterior: "Fotografía de exterior",
  estudio: "Fotografía de estudio",
  montaje: "Estudio y montaje",
  retrato: "Retrato",
  producto: "Fotografía de producto",
  promocional: "Video promocional",
  cobertura: "Cobertura de evento",
  reel: "Reel / Short-form",
  entrevista: "Entrevista",
  video_basico: "Producción básica",
  video_avanzado: "Producción avanzada",
  logo: "Logo",
  identidad_visual: "Identidad visual",
  material_promocional: "Material promocional",
  tarjeta: "Tarjeta de presentación",
  landing_page: "Landing page",
  web_corporativa: "Web corporativa",
  ecommerce: "E-commerce",
  redes_sociales: "Gestión de redes sociales",
  estrategia_contenido: "Estrategia de contenido",
  materiales_marketing: "Materiales de marketing",
};

const CAT_LABELS = {
  fotografia: "Fotografía",
  video: "Video",
  branding_diseno: "Branding & Diseño",
  web: "Web",
  marketing_digital: "Marketing digital",
};

const EYEBROW_MAP = {
  embarazo: "TEMÁTICA",
  boda: "MOMENTOS",
  love_story: "AMOR",
  cumpleanos: "CELEBRACIÓN",
  graduacion: "LOGRO",
  evento: "MOMENTOS",
  exterior: "EXTERIOR",
  estudio: "ESTUDIO",
  montaje: "CREATIVO",
  retrato: "RETRATO",
  producto: "ESTILO",
  promocional: "VIDEO",
  cobertura: "EVENTOS",
  reel: "REEL",
  entrevista: "ENTREVISTA",
  video_basico: "VIDEO",
  video_avanzado: "VIDEO",
  logo: "IDENTIDAD",
  identidad_visual: "IDENTIDAD",
  material_promocional: "DISEÑO",
  tarjeta: "DISEÑO",
  redes_sociales: "SOCIAL",
  estrategia_contenido: "ESTRATEGIA",
  materiales_marketing: "MARKETING",
  landing_page: "WEB",
  web_corporativa: "WEB",
  ecommerce: "E-COMMERCE",
};

const CAT_EYEBROW = {
  fotografia: "FOTOGRAFÍA",
  video: "VIDEO",
  branding_diseno: "DISEÑO GRÁFICO",
  web: "WEB",
  marketing_digital: "MARKETING",
};

const TITLE_STRIP = /^(?:sesión\s+)?fotografía\s+(?:de\s+\w+|para\s+\w+)\s+/i;
const SESS_STRIP = /^sesión\s+de\s+fotografía\s+(?:para\s+\w+|de\s+\w+)\s+/i;
const SESS_STRIP2 = /^sesión\s+fotografía\s+(?:de\s+\w+)\s+/i;

const TEMPLATE_PHRASES = [
  "aprovechando la luz natural y el entorno",
  "aprovechando la luz natural",
  "sesión de fotografía exterior realizada para",
  "sesión fotográfica en exterior realizada para",
];

const DESC = {
  exterior: [
    (n) => `Sesión al aire libre${n ? ` con ${n}` : ""}: luz natural, entorno abierto y una dirección de imagen que resalta personalidad y presencia con autenticidad.`,
    (n) => `${n ? `Con ${n}, l` : "L"}levamos la sesión a exteriores para crear imágenes espontáneas donde la luz real y el ambiente hacen el trabajo.`,
    (n) => `${n ? `${n} eligió el` : "El"} exterior como escenario para una sesión donde cada imagen captura carácter, contexto y una energía difícil de replicar en estudio.`,
    (n) => `Una sesión exterior${n ? ` con ${n}` : ""} pensada para mostrar presencia real: entorno natural, luz ambiental y composición con intención.`,
    (n) => `Imágenes en exterior${n ? ` con ${n}` : ""} que priorizan lo genuino: la luz del día, el contexto del lugar y momentos que se sienten verdaderos.`,
  ],
  boda: [
    (n) => `Cobertura completa${n ? ` del día de ${n}` : ""}: emociones reales, detalles cuidados y una narrativa visual que documenta cada momento sin perder lo espontáneo.`,
    (n) => `${n ? `El gran día de ${n}` : "El gran día"} registrado con un enfoque editorial que va más allá de las poses: momentos íntimos, risas y detalles que hacen única cada boda.`,
    (n) => `Fotografía de boda${n ? ` para ${n}` : ""} con atención a lo pequeño y a lo grande: la emoción del instante y la belleza del conjunto.`,
    (n) => `${n ? `Para ${n}, una` : "Una"} cobertura que documenta el día como fue: real, emotiva y con la calidad visual que esos momentos merecen.`,
  ],
  love_story: [
    (n) => `Sesión Love Story${n ? ` con ${n}` : ""}: momentos íntimos capturados en un ambiente natural que refleja la conexión real entre dos personas.`,
    (n) => `Un recorrido visual${n ? ` por el vínculo de ${n}` : ""}, fotografiado con luz suave, locaciones con significado y una dirección que invita a ser auténticos.`,
    (n) => `Love Story${n ? ` con ${n}` : ""}: imágenes que capturan complicidad, afecto y esa energía de pareja que es difícil fingir frente a la cámara.`,
  ],
  embarazo: [
    (n) => `Sesión de maternidad${n ? ` con ${n}` : ""}: imágenes que celebran esta etapa con calidez, elegancia y una mirada íntima sobre el inicio de algo nuevo.`,
    (n) => `${n ? `Para ${n}, una` : "Una"} sesión de embarazo que documenta la espera con luz suave, poses naturales y una energía que mezcla emoción y calma.`,
    (n) => `Fotografía de maternidad${n ? ` con ${n}` : ""}: un registro de esta etapa única, fotografiado con intención y respeto por el momento.`,
  ],
  cumpleanos: [
    (n) => `Cobertura${n ? ` del cumpleaños de ${n}` : " de cumpleaños"}: colores, detalles y momentos de celebración documentados con una mirada que captura la alegría del día.`,
    (n) => `${n ? `Para ${n}, un` : "Un"} registro visual completo de la celebración: desde los detalles de la decoración hasta los momentos más espontáneos del festejo.`,
    (n) => `Fotografía de cumpleaños${n ? ` para ${n}` : ""} con atención a los momentos compartidos, los detalles decorativos y la energía de la reunión.`,
  ],
  graduacion: [
    (n) => `Sesión de graduación${n ? ` con ${n}` : ""}: imágenes que celebran el logro con presencia definida y un ambiente de orgullo genuino.`,
    (n) => `${n ? `Para ${n}, imágenes` : "Imágenes"} de graduación pensadas para mostrar el esfuerzo detrás del título: composición clara, actitud y mucha satisfacción.`,
    (n) => `Fotografía de graduación${n ? ` para ${n}` : ""} que combina el formalismo del momento con la emoción personal de haber llegado hasta aquí.`,
  ],
  evento: [
    (n) => `Cobertura${n ? ` del evento de ${n}` : " de evento"}: momentos en contexto, con atención a los detalles que hacen que cada celebración sea única.`,
    (n) => `${n ? `Para ${n}, una` : "Una"} cobertura fotográfica que documenta el evento con agilidad y ojo editorial, sin perder los instantes que importan.`,
    (n) => `Fotografía de evento${n ? ` para ${n}` : ""}: imágenes que registran la energía del momento, los detalles de producción y todo lo que pasó.`,
  ],
  estudio: [
    (n) => `Sesión de estudio${n ? ` con ${n}` : ""}: luz controlada, fondo limpio y una dirección de imagen enfocada completamente en la presencia y el estilo.`,
    (n) => `${n ? `Con ${n}, una` : "Una"} sesión en estudio donde el control total de la iluminación crea un resultado preciso, limpio y muy profesional.`,
    (n) => `Fotografía de estudio${n ? ` para ${n}` : ""}: un ambiente controlado que permite destacar cada detalle con precisión y una paleta visual coherente.`,
  ],
  retrato: [
    (n) => `Retrato${n ? ` de ${n}` : ""}: una imagen construida con luz, composición y dirección que captura carácter más allá de la apariencia.`,
    (n) => `${n ? `Para ${n}, un` : "Un"} retrato que va más allá de la foto de perfil: presencia, expresión y una mirada que comunica quién es esta persona.`,
    (n) => `Sesión de retrato${n ? ` con ${n}` : ""} pensada para comunicar: quién eres, cómo te presentas y qué transmite tu imagen frente a la cámara.`,
  ],
  producto: [
    (n) => `Fotografía de producto${n ? ` para ${n}` : ""}: imágenes que muestran cada detalle con claridad y una presentación pensada para vender.`,
    (n) => `${n ? `Para ${n}, sesión` : "Sesión"} de producto con iluminación técnica, composición estratégica y un resultado que eleva la percepción del artículo.`,
    (n) => `Imágenes de producto${n ? ` para ${n}` : ""} desarrolladas para comunicar valor, calidad y atractivo visual en cualquier plataforma de venta.`,
  ],
  montaje: [
    (n) => `Sesión con montaje creativo${n ? ` para ${n}` : ""}: concepto, iluminación y composición trabajados juntos para crear una imagen de alto impacto visual.`,
    (n) => `${n ? `Para ${n}, una` : "Una"} producción en estudio que combina montaje, dirección de arte y fotografía técnica para un resultado editorial y diferente.`,
  ],
};

const DESC_GENERICS = [
  (n) => `Proyecto visual${n ? ` para ${n}` : ""}: imágenes que comunican con claridad, calidad y una dirección estética coherente desde la primera toma.`,
  (n) => `${n ? `Para ${n}, un` : "Un"} trabajo visual pensado desde la intención: cada imagen tiene propósito, técnica y una presencia que habla por sí sola.`,
  (n) => `${n ? `${n} confió en nosotros para crear` : "Un proyecto que buscó"} imágenes que van más allá de lo técnico: comunicación visual con identidad propia.`,
  (n) => `Producción visual${n ? ` con ${n}` : ""} diseñada para mostrar lo mejor del trabajo con una mirada profesional y una ejecución cuidada en cada detalle.`,
];

function looksLikeTemplate(text) {
  const t = (text || "").toLowerCase();
  return TEMPLATE_PHRASES.some((p) => t.includes(p));
}

function stableIndex(seed, length) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % length;
}

export function getCardEyebrow(item) {
  if (item.subcategory && EYEBROW_MAP[item.subcategory]) return EYEBROW_MAP[item.subcategory];
  const t = (item.title || "").toLowerCase();
  if (t.includes("embarazo") || t.includes("maternidad")) return "TEMÁTICA";
  if (t.includes("producto")) return "ESTILO";
  if (t.includes("boda") || t.includes("matrimonio")) return "MOMENTOS";
  if (t.includes("evento")) return "MOMENTOS";
  return CAT_EYEBROW[item.category] || (item.category || "").toUpperCase();
}

export function getCardTitle(item) {
  const raw = (item.title || "").trim();
  if (!raw) return "";
  if (item.category !== "fotografia") return raw;

  for (const re of [SESS_STRIP, SESS_STRIP2, TITLE_STRIP]) {
    const rest = raw.replace(re, "").trim();
    if (rest && rest.length > 3 && rest.length < raw.length) {
      return `Sesión fotográfica ${rest}`;
    }
  }
  return raw;
}

export function getItemDescription(item) {
  const db = (item.description || "").trim();
  if (db && !looksLikeTemplate(db)) return db;

  const templates = DESC[item.subcategory] || DESC_GENERICS;
  const name = item.clientName || "";
  const seed = item.id || item.slug || item.title || "";
  return templates[stableIndex(seed, templates.length)](name);
}

export function getSubcategoryLabel(subcategory) {
  if (!subcategory) return "";
  return (
    SUBCAT_LABELS[subcategory] ||
    subcategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function getCategoryLabel(category) {
  return CAT_LABELS[category] || category || "";
}

export function getYoutubeId(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (parsed.pathname.startsWith("/watch")) {
      id = parsed.searchParams.get("v") || "";
    } else if (parsed.pathname.includes("/shorts/")) {
      id = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    } else if (parsed.pathname.includes("/embed/")) {
      id = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
    }
    return id.split("?")[0].split("&")[0];
  } catch {
    return "";
  }
}

export function getYoutubeEmbedUrl(url) {
  const id = getYoutubeId(url);
  if (!id) return url || "";
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

export function getYoutubeThumbnail(url) {
  const id = getYoutubeId(url);
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}
