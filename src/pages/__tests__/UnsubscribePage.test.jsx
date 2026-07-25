import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { default: UnsubscribePage } = await import("@/pages/UnsubscribePage.jsx");

function renderPage(search = "") {
  window.history.pushState({}, "", `/unsubscribe${search}`);
  return render(
    <MemoryRouter initialEntries={[`/unsubscribe${search}`]}>
      <UnsubscribePage />
    </MemoryRouter>
  );
}

describe("UnsubscribePage — deliberately isolated (no Header/Footer), but always has a way back", () => {
  it("renders no <footer> (documented decision — isolated compliance page)", () => {
    renderPage("?token=abc");
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it('"ready" state (valid token) has a "No, volver al inicio" link to /', () => {
    renderPage("?token=abc");
    expect(screen.getByRole("link", { name: "No, volver al inicio" })).toHaveAttribute("href", "/");
  });

  it('missing-token "invalid" state still offers a "Contactar" link to /contacto', () => {
    renderPage("");
    expect(screen.getByRole("link", { name: "Contactar" })).toHaveAttribute("href", "/contacto");
  });

  it('"error" state (network failure on submit) offers "Intentar de nuevo" and "Contactar soporte"', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    renderPage("?token=abc");
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar suscripción" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Contactar soporte" })).toHaveAttribute(
      "href",
      "/contacto"
    );

    vi.unstubAllGlobals();
  });
});
