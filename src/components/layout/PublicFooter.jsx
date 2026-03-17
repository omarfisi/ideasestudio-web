import React from "react";
import { APP_CRM_URL } from "@/lib/constants.js";

export default function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-zinc-400 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ideas Estudio</p>
          <a href={APP_CRM_URL} className="font-medium text-white">
            App CRM
          </a>
        </div>
      </div>
    </footer>
  );
}
