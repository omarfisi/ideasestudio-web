import { useEffect, useState } from "react";
import { getPublicMembershipPlans } from "@/lib/api.js";
import MembershipPlanCards, { PlanCardSkeleton } from "@/components/memberships/MembershipPlanCards.jsx";

// Not currently rendered by any route — /servicios shows only the
// catalog now, and plans are reached per-service via the "Conocer
// planes" button (ServiceMembershipPlansModal) on ProductDetailPage.
// Kept intentionally (not deleted): a general "see every plan" section
// is still a reasonable thing to want later, and this component's own
// tests continue to guard its fetch/loading/error/empty behavior. Its
// card rendering now delegates to the shared, fetch-free
// MembershipPlanCards so there is only one place that formats a plan
// card.
export default function MembershipPlansSection() {
  const [status, setStatus] = useState("loading");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      try {
        const items = await getPublicMembershipPlans();
        if (cancelled) return;
        setPlans(items);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card-light max-w-xl" role="alert">
        <p className="body-md">
          No pudimos cargar los planes de membresía en este momento. Intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="card-light max-w-xl">
        <p className="body-md">Próximamente tendremos servicios mensuales disponibles.</p>
      </div>
    );
  }

  return <MembershipPlanCards plans={plans} />;
}
