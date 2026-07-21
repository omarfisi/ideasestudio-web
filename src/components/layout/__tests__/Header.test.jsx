import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const { default: Header } = await import("@/components/layout/Header.jsx");

const headerSource = readFileSync(path.join(__dirname, "../Header.jsx"), "utf8");

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe("Header — public menu no longer shows Membresías", () => {
  it("does not render a Membresías link anywhere (desktop or mobile)", () => {
    renderHeader();
    expect(screen.queryByText("Membresías")).not.toBeInTheDocument();
  });

  it("never links to /membresias in the component source", () => {
    expect(headerSource).not.toMatch(/\/membresias/);
  });

  it("still renders the Servicios link (desktop nav)", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
  });

  it("does not add a replacement top-level nav link in place of Membresías", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Navegacion principal" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent.trim());
    expect(links).toEqual(["Inicio", "Servicios", "Portafolio", "Equipo", "Blog", "Contacto"]);
  });

  it("mobile menu also has no Membresías link and still has Servicios", () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText("Abrir menu"));
    expect(screen.queryByText("Membresías")).not.toBeInTheDocument();
    expect(screen.getAllByText("Servicios").length).toBeGreaterThan(0);
  });
});
