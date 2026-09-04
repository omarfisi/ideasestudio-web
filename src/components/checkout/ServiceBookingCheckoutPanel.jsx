import { useEffect, useCallback, useState } from "react";
import { resolveProductSlugById } from "@/lib/api.js";
import { aggregateBookingStatus } from "@/lib/bookingCheckoutSteps.js";
import ServiceBookingPanel from "@/components/booking/ServiceBookingPanel.jsx";

// ─── slug detection (robust — covers all backend response shapes) ────────────

function getSlugFromItem(item) {
  return (
    item?.productSlug ||
    item?.product?.slug ||
    item?.product?.raw?.slug ||
    item?.product?.serviceTag ||
    item?.product_slug ||
    item?.snapshotSlug ||
    item?.snapshot_slug ||
    item?.service_slug ||
    item?.slug ||
    null
  );
}
// ─── panel wrapper ────────────────────────────────────────────────────────────

export default function ServiceBookingCheckoutPanel({
  cart,
  section = "hidden",
  resetSignal = 0,
  onSelectionChange,
  onStatusChange,
}) {
  const [resolvedItems, setResolvedItems] = useState(null);
  const [resolutionFailures, setResolutionFailures] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const rawItems = cart?.items || [];
    let cancelled = false;

    async function resolve() {
      const results = await Promise.all(
        rawItems.map(async (item) => {
          const name = item.snapshotName || item.product?.name || "Servicio";

          // 1. Try direct slug fields
          const directSlug = getSlugFromItem(item);
          if (directSlug) return { slug: directSlug, name, resolved: true };

          // 2. Check metadata fields (backend may store slug in snapshot metadata)
          const meta = item.metadata || {};
          const metaSlug =
            meta.slug ||
            meta.service_slug ||
            meta.product_slug ||
            meta.serviceSlug ||
            null;
          if (metaSlug) return { slug: metaSlug, name, resolved: true };

          // 3. Resolve by productId via store API
          if (item.productId) {
            const resolvedSlug = await resolveProductSlugById(item.productId);
            if (resolvedSlug) return { slug: resolvedSlug, name, resolved: true };
          }

          // Genuinely could not resolve a slug for this cart item — this is
          // NOT the same as "confirmed not a booking service" (see below).
          return { slug: null, name, resolved: false };
        })
      );
      // Promise.all([]) still resolves asynchronously, so an empty cart
      // reaches this same branch instead of needing a synchronous
      // early-return setState in the effect body.
      if (!cancelled) {
        setResolvedItems(results.filter((r) => r.resolved));
        setResolutionFailures(results.filter((r) => !r.resolved));
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [cart?.items]);

  const handleSectionStatus = useCallback((slug, info) => {
    setStatusMap((current) => ({ ...current, [slug]: info }));
  }, []);

  useEffect(() => {
    if (!onStatusChange) return;

    if (resolvedItems === null) {
      onStatusChange({
        status: "loading",
        hasBooking: false,
        requiresCalendar: false,
        hasCustomization: false,
        scheduleComplete: false,
        customizationComplete: false,
        services: [],
        resolutionErrors: [],
      });
      return;
    }

    const reportedStatuses = resolvedItems.map(
      (item) => statusMap[item.slug] || { slug: item.slug, name: item.name, resolved: false }
    );
    // A cart item whose slug could never be resolved is reported as a real
    // resolutionError, not folded into "no booking" — a booking service
    // that failed to resolve must never silently look confirmed-safe.
    const failureStatuses = resolutionFailures.map((failure, index) => ({
      slug: `__unresolved_${index}`,
      name: failure.name,
      resolved: true,
      resolutionError: true,
      hasCalendar: false,
      hasPackages: false,
      hasAddons: false,
      scheduleComplete: false,
      customizationComplete: false,
    }));

    const aggregate = aggregateBookingStatus(
      [...reportedStatuses, ...failureStatuses],
      resolvedItems.length + resolutionFailures.length
    );

    if (import.meta.env.DEV) {
      console.log("[booking-checkout] status:", aggregate.status, aggregate);
    }

    onStatusChange(aggregate);
  }, [resolvedItems, resolutionFailures, statusMap, onStatusChange]);

  // Still resolving which cart items even have a slug
  if (resolvedItems === null) return null;

  if (resolvedItems.length === 0) {
    if (import.meta.env.DEV && (cart?.items || []).length > 0 && section !== "hidden") {
      return (
        <p style={{ fontSize: "0.74rem", color: "#9b9189", marginBottom: 14, fontStyle: "italic" }}>
          [DEV] No se pudo resolver el slug del servicio — panel de booking oculto.
        </p>
      );
    }
    return null;
  }

  if (section === "hidden") {
    // Keep every ServiceBookingPanel mounted (reducers alive, no reload of
    // availability, no lost date/slot/package/addons) — just render nothing.
    return (
      <div style={{ display: "none" }}>
        {resolvedItems.map((item) => (
          <ServiceBookingPanel
            key={item.slug}
            slug={item.slug}
            serviceName={item.name}
            section={section}
            resetSignal={resetSignal}
            onSelectionChange={onSelectionChange}
            onStatusChange={handleSectionStatus}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="cbp-wrapper">
      {resolvedItems.map((item) => (
        <ServiceBookingPanel
          key={item.slug}
          slug={item.slug}
          serviceName={item.name}
          section={section}
          resetSignal={resetSignal}
          onSelectionChange={onSelectionChange}
          onStatusChange={handleSectionStatus}
        />
      ))}
    </div>
  );
}
