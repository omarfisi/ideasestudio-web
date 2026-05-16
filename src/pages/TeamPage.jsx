import { useEffect, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import { getPublicTeam } from "@/lib/api.js";
import SEOHead from "@/components/seo/SEOHead.jsx";

const EQUIPO_FALLBACK = [
  {
    id: 1,
    nombre: "Osvaldo Marfisi",
    rol: "Director Creativo & Fundador",
    descripcion:
      "Visionario detrás de cada proyecto. Con años de experiencia en fotografía, branding y producción visual, Osvaldo lidera cada trabajo con intención y detalle.",
    biografia:
      "Osvaldo Marfisi es el fundador y director creativo de Ideas Estudio. Con más de 10 años de experiencia en el mundo visual, ha trabajado con marcas, negocios y personas que buscan comunicar mejor su esencia. Su enfoque combina estrategia, estética y propósito, asegurando que cada proyecto no solo se vea bien, sino que también funcione. Osvaldo lidera el equipo con la misma energía y detalle que pone en cada entrega.",
    imagen:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    especialidades: ["Fotografía", "Dirección Creativa", "Branding"],
    redes: {
      instagram: "https://www.instagram.com/ideasestudiopr/",
      facebook: "https://www.facebook.com/ideasestudiopr",
      linkedin: null,
    },
  },
  {
    id: 2,
    nombre: "Ana Rodríguez",
    rol: "Diseñadora Gráfica",
    descripcion:
      "Responsable de la identidad visual de cada marca. Ana transforma ideas en sistemas visuales coherentes, modernos y con propósito.",
    biografia:
      "Ana Rodríguez es la diseñadora gráfica del equipo. Su pasión por la tipografía, el color y la composición se traduce en identidades visuales sólidas que comunican con claridad. Trabaja de cerca con cada cliente para entender su esencia y convertirla en un sistema visual que sea funcional, memorable y diferente. Ha diseñado desde logotipos hasta campañas completas para marcas en distintos sectores.",
    imagen:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    especialidades: ["Branding", "Diseño Web", "Materiales"],
    redes: {
      instagram: "https://www.instagram.com/ideasestudiopr/",
      facebook: null,
      linkedin: null,
    },
  },
  {
    id: 3,
    nombre: "Carlos Méndez",
    rol: "Director de Video",
    descripcion:
      "Especialista en producción audiovisual. Carlos dirige cada pieza de video con un enfoque cinematográfico que comunica con claridad y emoción.",
    biografia:
      "Carlos Méndez dirige la producción audiovisual de Ideas Estudio. Con formación en cine y comunicación visual, trae un enfoque cinematográfico a cada proyecto, ya sea un reel de 30 segundos o una cobertura completa de evento. Su trabajo combina técnica y sensibilidad, logrando piezas que no solo informan, sino que emocionan y conectan con la audiencia.",
    imagen:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
    especialidades: ["Video", "Edición", "Producción"],
    redes: {
      instagram: "https://www.instagram.com/ideasestudiopr/",
      facebook: null,
      linkedin: null,
    },
  },
  {
    id: 4,
    nombre: "Sofía Torres",
    rol: "Estratega de Contenido",
    descripcion:
      "Gestiona la presencia digital de nuestros clientes con una visión clara de comunicación, consistencia y resultados medibles en cada canal.",
    biografia:
      "Sofía Torres es la estratega de contenido del equipo. Su trabajo va más allá de publicar: analiza audiencias, define mensajes y construye calendarios de contenido que generan presencia consistente y resultados reales. Ha gestionado cuentas en Instagram, Facebook y otras plataformas para negocios de distintos sectores, siempre con un enfoque basado en datos y creatividad.",
    imagen:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80",
    especialidades: ["Redes Sociales", "Contenido", "Estrategia"],
    redes: {
      instagram: "https://www.instagram.com/ideasestudiopr/",
      facebook: "https://www.facebook.com/ideasestudiopr",
      linkedin: null,
    },
  },
];

// Normaliza el formato de la API al formato que usa el componente
function normalizeApiMember(m) {
  return {
    id: m.id,
    nombre: m.nombre,
    rol: m.rol,
    descripcion: m.descripcion || "",
    biografia: m.biografia || "",
    imagen: m.imagen_url || "",
    especialidades: m.especialidades || [],
    redes: {
      instagram: m.redes?.instagram || null,
      facebook:  m.redes?.facebook  || null,
      linkedin:  m.redes?.linkedin  || null,
    },
  };
}

const valores = [
  { numero: "01", titulo: "Intención", descripcion: "Cada decisión creativa está pensada para dar dirección, reforzar el mensaje y comunicar mejor." },
  { numero: "02", titulo: "Detalle", descripcion: "La calidad vive en los detalles. Nos tomamos el tiempo necesario para que cada pieza esté bien pensada y bien ejecutada." },
  { numero: "03", titulo: "Compromiso", descripcion: "Trabajamos como si el proyecto fuera nuestro. Tu marca, tu evento o tu negocio recibe el mismo cuidado que le daríamos al nuestro." },
  { numero: "04", titulo: "Claridad", descripcion: "Comunicamos con honestidad. Sin promesas vacías, sin confusión. Sabes exactamente lo que estás contratando y por qué." },
  { numero: "05", titulo: "Colaboración", descripcion: "Tu visión es el punto de partida. Trabajamos contigo, no solo para ti, para que el resultado final sea tuyo y se sienta auténtico." },
  { numero: "06", titulo: "Consistencia", descripcion: "Un buen proyecto no es accidental. Mantenemos un estándar de calidad constante en cada entrega, sin importar el tamaño del trabajo." },
  { numero: "07", titulo: "Resultados", descripcion: "Lo que hacemos tiene que servir. Medimos el éxito por el impacto real que generan nuestros proyectos en tu marca o negocio." },
  { numero: "08", titulo: "Evolución", descripcion: "El mercado cambia y nosotros también. Nos mantenemos actualizados para ofrecerte soluciones relevantes, modernas y efectivas." },
];

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 8H16V5H14C11.8 5 10 6.8 10 9V11H8V14H10V19H13V14H15.2L16 11H13V9C13 8.45 13.45 8 14 8Z" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M7 10v7M7 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 17v-4c0-1.1.9-2 2-2h1a2 2 0 0 1 2 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 10v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BiografiaModal({ open, onClose, persona }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open || !persona) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition hover:bg-black hover:text-white"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="flex flex-col sm:flex-row">
          <div className="relative h-56 w-full shrink-0 sm:h-auto sm:w-48">
            <img
              src={persona.imagen}
              alt={persona.nombre}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {persona.rol}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-neutral-950">
              {persona.nombre}
            </h3>

            <div className="mt-2 flex gap-3">
              {persona.redes.instagram && (
                <a href={persona.redes.instagram} target="_blank" rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-black hover:text-white"
                  aria-label="Instagram">
                  <InstagramIcon />
                </a>
              )}
              {persona.redes.facebook && (
                <a href={persona.redes.facebook} target="_blank" rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-black hover:text-white"
                  aria-label="Facebook">
                  <FacebookIcon />
                </a>
              )}
              {persona.redes.linkedin && (
                <a href={persona.redes.linkedin} target="_blank" rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-black hover:text-white"
                  aria-label="LinkedIn">
                  <LinkedInIcon />
                </a>
              )}
            </div>

            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {persona.biografia}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {persona.especialidades.map((esp) => (
                <span key={esp} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {esp}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function TeamGallery({ items }) {
  const [idx, setIdx] = useState(0);

  if (!items || items.length === 0) return null;

  const current = items[idx];
  const hasPrev = items.length > 1;

  function prev() { setIdx((i) => (i - 1 + items.length) % items.length); }
  function next() { setIdx((i) => (i + 1) % items.length); }

  const dateLabel = current.event_date
    ? new Date(current.event_date + "T00:00:00").toLocaleDateString("es-PR", { year: "numeric", month: "long" })
    : null;

  return (
    <section className="section-split px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">
            Ideas Estudio <span className="highlight-box-glow">en acción.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-neutral-500">
            Una mirada a los proyectos, eventos y espacios donde nuestro equipo ha trabajado.
          </p>
        </div>

        <div className="relative">
          {/* Imagen principal */}
          <div className="relative overflow-hidden rounded-[28px] shadow-[0_16px_48px_rgba(0,0,0,0.10)]" style={{ aspectRatio: "16/9" }}>
            <img
              key={current.id}
              src={current.image_url}
              alt={current.alt_text || current.title}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ objectPosition: current.object_position || "center" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              {(current.event_name || current.location) && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  {[current.event_name, current.location].filter(Boolean).join(" — ")}
                  {dateLabel && <span className="ml-3 normal-case tracking-normal font-normal">· {dateLabel}</span>}
                </p>
              )}
              {current.title && (
                <h3 className="mt-1 text-xl font-bold text-white md:text-2xl">{current.title}</h3>
              )}
              {current.description && (
                <p className="mt-1 text-sm leading-6 text-white/75 max-w-2xl">{current.description}</p>
              )}
            </div>

            {/* Flechas */}
            {hasPrev && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Anterior"
                  className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Siguiente"
                  className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
          </div>

          {/* Dots */}
          {items.length > 1 && (
            <div className="mt-5 flex justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === idx ? "w-6 bg-black" : "w-2 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function TeamPage() {
  const [personaActiva, setPersonaActiva] = useState(null);
  const [equipo, setEquipo] = useState([]);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicTeam()
      .then((data) => {
        const members = data?.members || [];
        setEquipo(members.length > 0 ? members.map(normalizeApiMember) : EQUIPO_FALLBACK);
        if (data?.group_photo?.image_url) setGroupPhoto(data.group_photo);
        if (data?.gallery?.length > 0) setGallery(data.gallery);
      })
      .catch(() => {
        setEquipo(EQUIPO_FALLBACK);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="bg-white text-neutral-950">
      <SEOHead
        title="Nuestro Equipo | Ideas Estudio"
        description="Conoce al equipo de Ideas Estudio: fotógrafos, diseñadores y creativos comprometidos con tu proyecto en Puerto Rico."
        canonical="https://ideasestudio.com/equipo"
      />

      {/* ── HERO ── */}
      <section className="px-4 pb-10 pt-16 md:px-6 md:pb-14 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
              Ideas Estudio
            </p>
            <h1 className="mt-4 text-5xl font-black leading-none tracking-tight text-black md:text-7xl">
              Cada proyecto nace de una <span className="highlight-box-glow">historia,</span> una idea y una persona.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-neutral-600 md:text-xl">
              Un equipo creativo comprometido con el detalle, la intención y los resultados. Cada persona aquí aporta una perspectiva única al trabajo que construimos juntos.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOTO GRUPAL ── */}
      {groupPhoto && (
        <section className="pb-10">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <img
              src={groupPhoto.image_url}
              alt={groupPhoto.alt_text || "El equipo creativo detrás de Ideas Estudio"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <p className="absolute bottom-5 left-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              {groupPhoto.title || "El equipo creativo detrás de Ideas Estudio"}
            </p>
          </div>
        </section>
      )}

      {/* ── EQUIPO ── */}
      <section className="section-split px-4 pb-16 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]">
                    <div className="aspect-[3/4] animate-pulse bg-neutral-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-neutral-200" />
                      <div className="h-3 w-full animate-pulse rounded-full bg-neutral-200" />
                      <div className="h-3 w-4/5 animate-pulse rounded-full bg-neutral-200" />
                    </div>
                  </div>
                ))
              : equipo.map((persona) => (
              <article
                key={persona.id}
                className="group overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={persona.imagen}
                    alt={persona.nombre}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* Redes sociales sobre la imagen */}
                  <div className="absolute right-3 top-3 flex flex-col gap-2">
                    {persona.redes.instagram && (
                      <a href={persona.redes.instagram} target="_blank" rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow transition hover:bg-[#f2cc3d]"
                        aria-label="Instagram" onClick={(e) => e.stopPropagation()}>
                        <InstagramIcon />
                      </a>
                    )}
                    {persona.redes.facebook && (
                      <a href={persona.redes.facebook} target="_blank" rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow transition hover:bg-[#f2cc3d]"
                        aria-label="Facebook" onClick={(e) => e.stopPropagation()}>
                        <FacebookIcon />
                      </a>
                    )}
                    {persona.redes.linkedin && (
                      <a href={persona.redes.linkedin} target="_blank" rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow transition hover:bg-[#f2cc3d]"
                        aria-label="LinkedIn" onClick={(e) => e.stopPropagation()}>
                        <LinkedInIcon />
                      </a>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      {persona.rol}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-white">
                      {persona.nombre}
                    </h2>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm leading-6 text-neutral-600">
                    {persona.descripcion}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {persona.especialidades.map((esp) => (
                      <span key={esp} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                        {esp}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonaActiva(persona)}
                    className="mt-4 w-full rounded-full border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-black hover:bg-black hover:text-white"
                  >
                    Ver biografía
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALERÍA ── */}
      <TeamGallery items={gallery} />

      {/* ── VALORES ── */}
      <section className="section-split px-4 pb-16 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Lo que guía nuestro <span className="highlight-box-glow">trabajo.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-neutral-500">
              No solo desarrollamos ideas; trabajamos con intención, compromiso y valores que dan dirección a cada decisión.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {valores.map((valor) => (
              <div key={valor.numero} className="rounded-[24px] bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                <p className="text-4xl font-black text-[#f2cc3d]">{valor.numero}</p>
                <h3 className="mt-4 text-xl font-bold text-neutral-950">{valor.titulo}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{valor.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-split">
        <div className="container">
          <div className="service-route-cta">
            <div className="service-route-cta__copy">
              <h2>
                <span className="highlight-box-glow">Trabajemos</span>{" "}
                juntos en tu próximo proyecto.
              </h2>
              <p>
                Nuestro equipo está listo para escucharte y ayudarte a construir algo que comunique mejor, se vea profesional y genere resultados.
              </p>
            </div>
            <div className="service-route-cta__actions">
              <Button to="/contacto?mode=proposal&cta=team">
                Hablar con el equipo
              </Button>
              <Button to="/servicios" variant="secondary">
                Ver servicios
              </Button>
            </div>
          </div>
        </div>
      </section>

      <BiografiaModal
        open={Boolean(personaActiva)}
        onClose={() => setPersonaActiva(null)}
        persona={personaActiva}
      />

    </main>
  );
}
