import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { default: HashScrollHandler } = await import("@/components/layout/HashScrollHandler.jsx");

// jsdom doesn't implement real layout/scrolling — scrollIntoView and
// getBoundingClientRect are mocked so the component's own scroll-vs-drift
// decisions can be tested deterministically.
function mockRectSequence(rects) {
  let call = 0;
  return vi.fn(() => {
    const r = rects[Math.min(call, rects.length - 1)];
    call += 1;
    return { top: r, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderAt(hashPath) {
  return render(
    <MemoryRouter initialEntries={[hashPath]}>
      <HashScrollHandler />
    </MemoryRouter>
  );
}

describe("HashScrollHandler — no hash in the URL", () => {
  it("never calls scrollIntoView when there is no hash", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderAt("/blog");
    vi.advanceTimersByTime(2000);

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe("HashScrollHandler — element already present", () => {
  it("scrolls to the matching element once it exists", () => {
    const el = document.createElement("div");
    el.id = "contacto";
    el.getBoundingClientRect = mockRectSequence([0]);
    document.body.appendChild(el);

    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderAt("/blog#contacto");
    vi.advanceTimersByTime(50);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });
});

describe("HashScrollHandler — element mounts late", () => {
  it("retries via requestAnimationFrame until the element appears, then scrolls", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderAt("/blog#portafolio");

    // Element doesn't exist yet — no scroll should have happened.
    vi.advanceTimersByTime(0);
    expect(scrollSpy).not.toHaveBeenCalled();

    const el = document.createElement("div");
    el.id = "portafolio";
    el.getBoundingClientRect = mockRectSequence([0]);
    document.body.appendChild(el);

    // Let the rAF retry loop (mocked via fake timers -> rAF still schedules
    // a macrotask under jsdom) catch up now that the element exists.
    vi.advanceTimersByTime(1000);

    expect(scrollSpy).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});

describe("HashScrollHandler — corrects for late layout shift within the settle window", () => {
  it("re-scrolls if the target element drifts away from the top after the initial scroll", () => {
    const el = document.createElement("div");
    el.id = "contacto";
    // First read (initial scroll): already at top (0) -> only the initial
    // scrollIntoView call. Then it drifts to 700px (simulating async
    // content loading above it) -> the settle-window poll must react.
    el.getBoundingClientRect = mockRectSequence([0, 700, 700, 0, 0, 0, 0, 0, 0, 0]);
    document.body.appendChild(el);

    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderAt("/servicios#contacto");
    vi.advanceTimersByTime(50); // initial scrollIntoView

    const callsAfterInitial = scrollSpy.mock.calls.length;
    expect(callsAfterInitial).toBeGreaterThanOrEqual(1);

    vi.advanceTimersByTime(1600); // exhaust the settle window's poll interval

    expect(scrollSpy.mock.calls.length).toBeGreaterThan(callsAfterInitial);
    document.body.removeChild(el);
  });
});

describe("HashScrollHandler — respects prefers-reduced-motion", () => {
  it('uses behavior "auto" instead of "smooth" when the user prefers reduced motion', () => {
    const el = document.createElement("div");
    el.id = "contacto";
    el.getBoundingClientRect = mockRectSequence([0]);
    document.body.appendChild(el);

    vi.stubGlobal("matchMedia", (query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));

    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderAt("/blog#contacto");
    vi.advanceTimersByTime(50);

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
    document.body.removeChild(el);
  });
});
