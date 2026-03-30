export default function QulandSystemPreview() {
  return (
    <main className="bg-white">
      {/* HERO CLARO */}
      <section className="block-light section-space overflow-hidden">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow-yellow">Preview visual de sistema</span>

            <h1 className="hero-title mt-6 max-w-5xl">
              Diseñamos una web más{" "}
              <span className="text-ideas-yellow">clara</span>, fuerte y
              conectada con tu marca
            </h1>

            <p className="body-lg mt-6 max-w-3xl">
              Esta página funciona como laboratorio visual para validar el
              lenguaje de Ideas Estudio usando Manrope + Inter, bloques claros,
              bloques oscuros, contraste correcto y botones con más fuerza.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/servicios" className="btn-primary">
                Explorar servicios
              </a>
              <a href="/contacto" className="btn-secondary-light">
                Solicitar información
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="card-light">
                <p className="label-text">Dirección visual</p>
                <p className="body-md mt-3">
                  Negro, blanco y amarillo con una composición limpia,
                  comercial y editorial.
                </p>
              </div>

              <div className="card-light">
                <p className="label-text">Jerarquía</p>
                <p className="body-md mt-3">
                  Titulares grandes, texto claro y acciones visibles sin
                  saturar la pantalla.
                </p>
              </div>

              <div className="card-light">
                <p className="label-text">Objetivo</p>
                <p className="body-md mt-3">
                  Diseñar mejor sin tocar la lógica de CRM, leads, ecommerce ni
                  checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="card-light min-h-[520px] overflow-hidden border border-black/10">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <span className="eyebrow-dark">Composición visual</span>
                  <h2 className="section-title mt-6 max-w-2xl">
                    Un sistema consistente para hero, cards, CTA y bloques
                    estratégicos
                  </h2>
                  <p className="body-md mt-5 max-w-xl">
                    Aquí no estamos probando backend ni formularios. Solo
                    estamos validando cómo se ve la web antes de bajar estos
                    bloques a producción.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-[#0B0B0D] p-6 text-white">
                    <p className="label-text text-[#F9D001]">Bloque oscuro</p>
                    <p className="mt-4 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em]">
                      Contraste fuerte
                    </p>
                    <p className="mt-3 font-body text-[16px] leading-[1.65]">
                      Texto blanco, acentos amarillos y CTA visibles.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-black/10 bg-white p-6">
                    <p className="label-text">Bloque claro</p>
                    <p className="mt-4 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em]">
                      Lectura limpia
                    </p>
                    <p className="mt-3 font-body text-[16px] leading-[1.65]">
                      Más aire, mejor ritmo y una estructura más clara.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#F9D001]" />
          </div>
        </div>
      </section>

      {/* GRID DE CARDS CLARAS */}
      <section className="block-light section-space">
        <div className="page-shell">
          <div className="max-w-3xl">
            <span className="eyebrow-dark">Servicios en bloques</span>
            <h2 className="section-title mt-6">
              Tarjetas limpias para presentar rutas, servicios y soluciones
            </h2>
            <p className="body-lg mt-5 max-w-3xl">
              Este patrón sirve para la Home, páginas de servicios, categorías
              de soluciones y caminos según el tipo de cliente.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <article className="card-light">
              <span className="eyebrow-yellow">Branding</span>
              <h3 className="card-title mt-6">
                Construcción visual para marcas y negocios
              </h3>
              <p className="body-md mt-4">
                Dirección visual, identidad, piezas base y consistencia para
                negocios que necesitan verse más claros y profesionales.
              </p>
              <div className="mt-8">
                <a href="/servicios" className="btn-secondary-light">
                  Ver solución
                </a>
              </div>
            </article>

            <article className="card-light">
              <span className="eyebrow-yellow">Contenido</span>
              <h3 className="card-title mt-6">
                Contenido para redes, campañas y presencia digital
              </h3>
              <p className="body-md mt-4">
                Piezas visuales, fotografía, video y materiales que ayudan a
                comunicar mejor lo que ofrece tu negocio.
              </p>
              <div className="mt-8">
                <a href="/servicios" className="btn-secondary-light">
                  Ver solución
                </a>
              </div>
            </article>

            <article className="card-light">
              <span className="eyebrow-yellow">Web</span>
              <h3 className="card-title mt-6">
                Páginas pensadas para mostrar, captar y vender
              </h3>
              <p className="body-md mt-4">
                Sitios enfocados en claridad, conversión y estructura visual sin
                romper la lógica del CRM ni del ecommerce.
              </p>
              <div className="mt-8">
                <a href="/servicios" className="btn-secondary-light">
                  Ver solución
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* BLOQUE OSCURO CORRECTO */}
      <section className="block-dark section-space">
        <div className="page-shell grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card-dark">
            <span className="eyebrow-yellow">Mapa del segmento</span>

            <h2 className="section-title-dark mt-6 max-w-4xl">
              Si tu marca necesita orden, presencia y una ruta clara para crecer,
              este tipo de bloque debe verse{" "}
              <span className="text-ideas-yellow">fuerte</span> y legible
            </h2>

            <p className="body-md-dark mt-6 max-w-3xl">
              Aquí es donde corregimos el problema que viste en las imágenes 3 y
              4: nada de texto apagado, nada de botones perdidos y nada de
              contenido que se mezcle con el fondo oscuro.
            </p>

            <ul className="list-ideas mt-8">
              <li>El título debe ir en blanco con palabras clave en amarillo.</li>
              <li>Los párrafos deben mantenerse en blanco para no perder lectura.</li>
              <li>Los botones tienen que separarse claramente del fondo oscuro.</li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/contacto" className="btn-primary">
                Comenzar proyecto
              </a>
              <a href="/servicios" className="btn-secondary-dark">
                Ver servicios
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-light">
              <span className="eyebrow-yellow">Quién suele entrar aquí</span>
              <h3 className="card-title mt-6">
                Negocios que se ven improvisados o desconectados
              </h3>
              <p className="body-md mt-4">
                Marcas nuevas, negocios con identidad débil o proyectos que ya
                tienen piezas sueltas pero no una dirección visual unificada.
              </p>
            </div>

            <div className="card-dark">
              <span className="eyebrow-yellow">Lo primero que conviene resolver</span>
              <h3 className="card-title mt-6 text-white">
                Definir estructura, tono y sistema visual
              </h3>
              <p className="body-md-dark mt-4">
                Antes de bajar todo a la Home real, servicios, portafolio y
                ecommerce, este sistema debe quedar estable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL OSCURO */}
      <section className="block-dark section-space">
        <div className="page-shell">
          <div className="card-dark overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <span className="eyebrow-yellow">Cierre del preview</span>

                <h2 className="hero-title-dark mt-6 max-w-5xl text-[42px] sm:text-[56px] md:text-[68px] lg:text-[82px] xl:text-[92px]">
                  Así debe sentirse la web antes de pasar a producción
                </h2>

                <p className="body-lg-dark mt-6 max-w-3xl">
                  Clara, fuerte, comercial y bien organizada. El siguiente paso
                  real después de aprobar este preview es bajar el Hero nuevo a
                  la Home sin tocar la lógica sensible.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="/contacto" className="btn-primary">
                    Solicitar propuesta
                  </a>
                  <a href="/" className="btn-secondary-dark">
                    Volver al inicio
                  </a>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="label-text text-[#F9D001]">Tipografía</p>
                  <p className="mt-4 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em] text-white">
                    Manrope + Inter
                  </p>
                  <p className="mt-3 font-body text-[16px] leading-[1.65] text-white">
                    Impacto arriba, claridad abajo.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="label-text text-[#F9D001]">Color</p>
                  <p className="mt-4 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em] text-white">
                    Negro, blanco y amarillo
                  </p>
                  <p className="mt-3 font-body text-[16px] leading-[1.65] text-white">
                    Sin gris en tipografía.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
