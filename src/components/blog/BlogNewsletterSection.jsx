import { useMemo, useState } from "react";
import { submitLeadForm } from "@/lib/publicLeadForms.js";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

export default function BlogNewsletterSection({
  eyebrow = "Ideas Estudio",
  title = "Recibe ideas para construir una marca más clara.",
  description = "Suscríbete para recibir contenido sobre branding, páginas web, marketing digital y estrategias para hacer crecer tu negocio.",
  source = "website_blog",
  segments = ["blog_subscribers", "newsletter"],
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => isValidEmail(email) && String(name).trim().length >= 2,
    [email, name]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setError("Escribe tu nombre y un correo válido para continuar.");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      await submitLeadForm({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        source,
        segment: "blog_subscribers",
        segments,
        submission_kind: "newsletter_signup",
        message: `Suscripción newsletter desde ${source}`,
        meta: { page_url: typeof window !== "undefined" ? window.location.pathname : "" },
      });
      setStatus("success");
    } catch (err) {
      setError(err?.message || "No se pudo enviar. Inténtalo nuevamente.");
      setStatus("error");
    }
  }

  return (
    <section className="mx-auto my-20 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)] md:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">

          {/* Left — copy */}
          <div>
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-4 text-4xl font-black leading-[0.97] tracking-[-0.05em] text-slate-950 md:text-5xl">
              {title}
            </h2>
            {description && (
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 md:text-lg">
                {description}
              </p>
            )}
          </div>

          {/* Right — form */}
          <div className="rounded-[24px] bg-slate-50 p-6 md:p-7">
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f2cc3d] text-2xl font-black text-slate-950">
                  ✓
                </div>
                <p className="text-lg font-black text-slate-950">¡Listo!</p>
                <p className="text-sm text-slate-500">
                  Gracias por suscribirte. Pronto recibirás contenido útil directamente en tu correo.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                {/* Honeypot */}
                <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: 0 }}>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f2cc3d] focus:ring-4 focus:ring-[#f2cc3d]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f2cc3d] focus:ring-4 focus:ring-[#f2cc3d]/20"
                  />
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-1 h-13 w-full rounded-2xl bg-[#f2cc3d] px-6 text-base font-black text-slate-950 transition hover:bg-[#e4bd27] disabled:opacity-60"
                >
                  {status === "loading" ? "Enviando…" : "Recibir contenido"}
                </button>

                <p className="pt-1 text-center text-xs leading-5 text-slate-400">
                  Al suscribirte aceptas recibir contenido educativo de Ideas Estudio.
                  Puedes darte de baja cuando quieras.
                </p>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
