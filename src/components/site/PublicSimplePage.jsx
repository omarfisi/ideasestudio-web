import React from "react";
import { Link } from "react-router-dom";

export default function PublicSimplePage({
  eyebrow = "Ideas Estudio",
  title = "Pagina",
  description = "Contenido en construccion.",
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
        {description}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/contacto"
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Solicitar informacion
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
