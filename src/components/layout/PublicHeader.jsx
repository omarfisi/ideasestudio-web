import React from "react";
import { Link } from "react-router-dom";
import { APP_CRM_URL } from "@/lib/constants.js";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-bold text-white">
            IE
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-zinc-950">
              Ideas Estudio
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Creative & Digital
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-700 lg:flex">
          <Link to="/">Inicio</Link>
          <Link to="/servicios">Servicios</Link>
          <Link to="/portafolio">Portafolio</Link>
          <Link to="/nosotros">Nosotros</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contacto">Contacto</Link>
        </nav>

        <a
          href={APP_CRM_URL}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          App CRM
        </a>
      </div>
    </header>
  );
}
