import { useCallback, useEffect, useState } from "react";
import { getPublicMembershipPlansByService } from "@/lib/api.js";

/**
 * Loads the membership plans that include a given service, once, so a
 * page can decide what to render (e.g. which CTA to show) before the
 * user ever opens a plans modal — instead of the modal being the only
 * thing that knows whether plans exist. `enabled` lets a caller skip the
 * request entirely for products that don't need this decision (e.g.
 * non-monthly purchase flows), so this never fires more requests than
 * the page actually needs.
 */
const INERT_STATE = { plans: [], loading: false, error: null };

export function useServiceMembershipPlans(serviceId, { enabled = true } = {}) {
  const active = Boolean(enabled && serviceId);
  const [state, setState] = useState({ plans: [], loading: active, error: null });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;

    async function load() {
      setState({ plans: [], loading: true, error: null });
      try {
        const items = await getPublicMembershipPlansByService(serviceId);
        if (cancelled) return;
        setState({ plans: items, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({ plans: [], loading: false, error });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [serviceId, active, retryToken]);

  // Monthly-flow services never fall back to direct purchase, so a failed
  // or empty plans fetch must offer a real way forward instead of a dead
  // end — retry() re-runs the same request on demand.
  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  const effective = active ? state : INERT_STATE;
  return { ...effective, hasPlans: effective.plans.length > 0, retry };
}
