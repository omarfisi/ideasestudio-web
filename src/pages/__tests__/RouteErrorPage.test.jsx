import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const { default: RouteErrorPage } = await import("@/pages/RouteErrorPage.jsx");

// createMemoryRouter's data-router loaders resolve asynchronously (even a
// synchronous throw is processed via a microtask), so the errorElement
// isn't mounted yet on the tick right after render() — every assertion
// below uses the async findBy* queries (auto-retrying) rather than getBy*.
function renderWithThrowingLoader(initialEntries = ["/"]) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            loader: () => {
              throw new Error("Failed to fetch");
            },
            element: <div>never rendered</div>,
          },
          { path: "otra", element: <div>otra pagina</div> },
        ],
      },
    ],
    { initialEntries }
  );
  return render(<RouterProvider router={router} />);
}

describe("RouteErrorPage — always offers three explicit ways out", () => {
  it("has a link back to home", async () => {
    renderWithThrowingLoader();
    expect(await screen.findByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("has a retry link to the services catalog", async () => {
    renderWithThrowingLoader();
    expect(
      await screen.findByRole("link", { name: /Reintentar desde catalogo/ })
    ).toHaveAttribute("href", "/servicios");
  });

  it('has a "Volver atras" button (previously missing)', async () => {
    renderWithThrowingLoader();
    expect(await screen.findByRole("button", { name: "Volver atras" })).toBeInTheDocument();
  });
});

describe("RouteErrorPage — Failed to fetch message", () => {
  it("still shows the friendly network-error copy for a raw 'Failed to fetch' error", async () => {
    renderWithThrowingLoader();
    expect(
      await screen.findByText(/No se pudo conectar con el backend local/)
    ).toBeInTheDocument();
  });
});

describe("RouteErrorPage — no site Footer here (deliberate, documented)", () => {
  it("does not render a <footer> element", async () => {
    renderWithThrowingLoader();
    await screen.findByRole("link", { name: "Volver al inicio" });
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
