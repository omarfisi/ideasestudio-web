import { useState } from "react";
import ServiceMembershipPlansModal from "@/components/memberships/ServiceMembershipPlansModal.jsx";

/**
 * Reusable "open the membership plans modal" control. A real
 * type="button" that only ever opens ServiceMembershipPlansModal — never
 * navigates, never touches the cart, never adds the base service.
 *
 * Callers own the plans/loading/error/hasPlans state (via
 * useServiceMembershipPlans) and pass it in, instead of this component
 * fetching on its own — so a catalog card and a detail page rendering
 * the same service never duplicate the request, and both stay hidden
 * until the caller actually knows the service has published plans.
 */
export default function ServiceMembershipPlansTrigger({
  serviceId,
  serviceName,
  plans,
  loading,
  error,
  hasPlans,
  children,
  className,
  onOpen,
}) {
  const [open, setOpen] = useState(false);

  if (!serviceId || !hasPlans) return null;

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
    onOpen?.();
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>
      <ServiceMembershipPlansModal
        serviceId={serviceId}
        serviceName={serviceName}
        open={open}
        onClose={() => setOpen(false)}
        plans={plans}
        loading={loading}
        error={error}
      />
    </>
  );
}
