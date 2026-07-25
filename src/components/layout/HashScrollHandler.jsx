import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// react-router's own <ScrollRestoration /> does try to scroll to the
// location.hash element, but only once, synchronously, in a useLayoutEffect
// right after the route commits (see useScrollRestoration in
// react-router/dist/development/chunk-2YMDXNOJ.js — a single
// `el.scrollIntoView()` call, no retry). Confirmed by real-browser testing
// (Playwright) that this is not reliable: navigating from /blog or
// /servicios to a footer anchor like "#contacto" can land 700-1000px off
// target for ~1-2s while async content below the target still loads and
// shifts the layout, before eventually self-correcting (or not, depending
// on timing). This component is a small, centralized correction layer:
// it waits for the target element to exist, scrolls to it, and keeps
// re-checking/re-correcting for a short settle window in case later
// layout shifts move the target — without fighting the user if they
// start scrolling themselves.
const SETTLE_WINDOW_MS = 1500;
const POLL_INTERVAL_MS = 150;
const DRIFT_TOLERANCE_PX = 8;

export default function HashScrollHandler() {
  const location = useLocation();
  const userInterruptedRef = useRef(false);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return undefined;

    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return undefined;
    }
    if (!id) return undefined;

    userInterruptedRef.current = false;
    let cancelled = false;
    let rafId = null;
    let pollTimer = null;

    function stopOnUserInput() {
      userInterruptedRef.current = true;
    }
    window.addEventListener("wheel", stopOnUserInput, { passive: true });
    window.addEventListener("touchmove", stopOnUserInput, { passive: true });
    window.addEventListener("keydown", stopOnUserInput);

    function prefersReducedMotion() {
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function scrollToElement(el) {
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    }

    function settleAndCorrect() {
      const startedAt = Date.now();
      pollTimer = setInterval(() => {
        if (cancelled || userInterruptedRef.current) {
          clearInterval(pollTimer);
          return;
        }
        if (Date.now() - startedAt > SETTLE_WINDOW_MS) {
          clearInterval(pollTimer);
          return;
        }
        const current = document.getElementById(id);
        if (!current) return;
        const top = current.getBoundingClientRect().top;
        if (Math.abs(top) > DRIFT_TOLERANCE_PX) {
          scrollToElement(current);
        }
      }, POLL_INTERVAL_MS);
    }

    function waitForElement(attemptsLeft) {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        scrollToElement(el);
        settleAndCorrect();
        return;
      }
      if (attemptsLeft > 0) {
        rafId = requestAnimationFrame(() => waitForElement(attemptsLeft - 1));
      }
    }

    rafId = requestAnimationFrame(() => waitForElement(30));

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("wheel", stopOnUserInput);
      window.removeEventListener("touchmove", stopOnUserInput);
      window.removeEventListener("keydown", stopOnUserInput);
    };
    // location.key changes on every navigation (including a click on the
    // same hash from a different route), so it's included alongside
    // pathname/hash to re-run this on every relevant navigation.
  }, [location.pathname, location.hash, location.key]);

  return null;
}
