import DecisionCard from "@/components/landing/cards/DecisionCard.jsx";
import { decisionRoutes } from "@/data/landing/decisionRoutes.js";

export default function LandingDecisionGrid() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/50">
            Elige tu camino
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-black md:text-4xl">
            ¿Qué estás buscando hoy?
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {decisionRoutes.map((item) => (
            <DecisionCard key={item.key} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
