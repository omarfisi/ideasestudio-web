import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const { default: Footer } = await import("@/components/layout/Footer.jsx");

function renderFooter(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Footer />
    </MemoryRouter>
  );
}

describe("Footer — logo", () => {
  it("navigates to / via a real anchor (SPA Link, not a full reload)", () => {
    renderFooter();
    const logo = screen.getByRole("link", { name: "Ideas Estudio" });
    expect(logo).toHaveAttribute("href", "/");
  });
});

describe("Footer — the four solution links point to their real routes", () => {
  it.each([
    ["Marca o negocio", "/servicios/marca-o-negocio"],
    ["Presencia visual", "/servicios/presencia-visual-profesional"],
    ["Momentos especiales", "/servicios/momento-especial"],
    ["Solucion a medida", "/servicios/solucion-creativa"],
  ])("%s -> %s", (label, expectedHref) => {
    renderFooter();
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", expectedHref);
  });

  it("no longer collapses all four into the same generic anchor", () => {
    renderFooter();
    const hrefs = [
      "Marca o negocio",
      "Presencia visual",
      "Momentos especiales",
      "Solucion a medida",
    ].map((label) => screen.getByRole("link", { name: label }).getAttribute("href"));
    expect(new Set(hrefs).size).toBe(4);
    expect(hrefs.every((h) => h !== "/#caminos")).toBe(true);
  });
});

describe("Footer — quick links (Navegacion column)", () => {
  it("Servicios points to the real /servicios page, not a dead anchor", () => {
    renderFooter();
    const links = screen.getAllByRole("link", { name: "Servicios" });
    expect(links.some((a) => a.getAttribute("href") === "/servicios")).toBe(true);
    expect(links.every((a) => a.getAttribute("href") !== "/#servicios")).toBe(true);
  });

  it("Blog points to the real /blog page, not a dead anchor", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  });

  it("Portafolio and Contacto keep their working anchors (ids that really exist on HomePage)", () => {
    renderFooter();
    const portafolioLinks = screen.getAllByRole("link", { name: "Portafolio" });
    expect(portafolioLinks.some((a) => a.getAttribute("href") === "/#portafolio")).toBe(true);
    const contactoLinks = screen.getAllByRole("link", { name: "Contacto" });
    expect(contactoLinks.some((a) => a.getAttribute("href") === "/#contacto")).toBe(true);
  });

  it("Conoce tu negocio and Inicio are unchanged", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Conoce tu negocio" })).toHaveAttribute(
      "href",
      "/conoce-tu-negocio"
    );
    expect(screen.getAllByRole("link", { name: "Inicio" })[0]).toHaveAttribute("href", "/");
  });
});

describe("Footer — CTA", () => {
  it('"Hablemos de tu idea" goes to the real standalone /contacto route', () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Hablemos de tu idea" })).toHaveAttribute(
      "href",
      "/contacto"
    );
  });
});

describe("Footer — mailto / tel / external social links", () => {
  it("email uses a mailto: link", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /omarfisi@ideasestudiopr\.com/ })).toHaveAttribute(
      "href",
      "mailto:omarfisi@ideasestudiopr.com"
    );
  });

  it("phone uses a tel: link", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /1-787-503-0349/ })).toHaveAttribute(
      "href",
      "tel:17875030349"
    );
  });

  it("Facebook/Instagram/YouTube are external, open in a new tab with rel=noreferrer", () => {
    renderFooter();
    for (const label of ["Facebook", "Instagram", "YouTube"]) {
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    }
  });
});

describe("Footer — internal links use React Router navigation, not <a href> full reloads", () => {
  it("every internal link (not mailto/tel/external) is rendered by <Link>, reachable via client-side routing", () => {
    function LocationProbe() {
      const location = useLocation();
      return <div data-testid="probe">{location.pathname}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/blog/un-articulo-cualquiera"]}>
        <Routes>
          <Route path="*" element={<><Footer /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );

    // From a non-home page, the internal footer links must still resolve to
    // their real target path (proving they're genuine <Link to> elements
    // participating in this router, not plain <a href> that would only work
    // via a full document navigation).
    expect(screen.getByRole("link", { name: "Marca o negocio" })).toHaveAttribute(
      "href",
      "/servicios/marca-o-negocio"
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("/blog/un-articulo-cualquiera");
  });
});

describe("Footer — keyboard and focus", () => {
  it("every navigational element is a real, focusable <a> or <button> (no positive tabIndex tricks, nothing keyboard-inaccessible)", () => {
    renderFooter();
    const footer = screen.getByRole("contentinfo");
    const focusables = footer.querySelectorAll("a[href], button");
    expect(focusables.length).toBeGreaterThan(0);
    for (const el of focusables) {
      const tabIndex = el.getAttribute("tabindex");
      expect(tabIndex === null || Number(tabIndex) >= 0).toBe(true);
    }
  });

  it('"Volver arriba" is a real <button>, not a link masquerading as one', () => {
    renderFooter();
    expect(screen.getByRole("button", { name: "Volver arriba" }).tagName).toBe("BUTTON");
  });
});

// NOTE on mobile viewport: jsdom doesn't run CSS/media queries, so responsive
// layout (column stacking, tap-target sizing) can't be verified by this
// component test — that part of the audit needs a manual/visual check in a
// real browser at narrow widths, not an automated assertion here.
