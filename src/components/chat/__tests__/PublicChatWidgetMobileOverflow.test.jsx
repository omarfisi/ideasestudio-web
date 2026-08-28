// P0 MOBILE VISUAL COMPLETION (item 4) — "no afirmar que jsdom valida
// geometría real, pero usarlo para prevenir reglas CSS obvias". Two
// deliberately different kinds of check, kept separate so neither is
// mistaken for the other:
//
//   1) A STATIC SOURCE AUDIT of PublicChatWidget.css's mobile media query
//      for the concrete anti-patterns named in the task (unguarded 100vw,
//      stray nowrap, translateX, negative margins, oversized fixed
//      widths). This is real, deterministic, and does catch the actual
//      class of bug that produces horizontal overflow — it just can't
//      catch every possible cause.
//
//   2) A DOM smoke check (scrollWidth <= clientWidth on the elements
//      named in the task — panel/prechat/actions/handoff/composer). jsdom
//      implements no layout engine: every element's scrollWidth and
//      clientWidth are 0 in this environment, so this assertion is
//      trivially true and CANNOT prove the real device is overflow-free.
//      It exists only as a placeholder that fails loudly if the DOM
//      structure itself goes missing — it is not, and must never be
//      reported as, evidence of real-device correctness.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  verifyPrechat: vi.fn(),
  getPublicChatStatus: vi.fn(),
  getPublicChatEvents: vi.fn(),
  getPublicAvatarRuntime: vi.fn(),
  requestPublicChatHuman: vi.fn(),
  recognizeVisitor: vi.fn(),
  forgetVisitor: vi.fn(),
}));
vi.mock("@/lib/publicFormsApi.js", () => ({ submitPublicForm: vi.fn() }));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const { getPublicChatEvents, getPublicAvatarRuntime, recognizeVisitor } = await import(
  "@/services/publicChatApi.js"
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.resolve(__dirname, "../PublicChatWidget.css");

function extractMobileMediaBlock(cssText) {
  const start = cssText.indexOf("@media (max-width: 768px)");
  if (start === -1) throw new Error("mobile media query not found — has it been renamed/removed?");
  const braceStart = cssText.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < cssText.length; i += 1) {
    if (cssText[i] === "{") depth += 1;
    else if (cssText[i] === "}") {
      depth -= 1;
      if (depth === 0) return cssText.slice(braceStart + 1, i);
    }
  }
  throw new Error("unterminated mobile media query");
}

describe("PublicChatWidget mobile CSS — auditoría estática de overflow horizontal", () => {
  const mobileCss = extractMobileMediaBlock(readFileSync(CSS_PATH, "utf8"));

  it("todo uso de vw dentro del bloque mobile está contenido por max-width, nunca una width sin límite", () => {
    const lines = mobileCss.split("\n").filter((line) => line.includes("vw"));
    for (const line of lines) {
      expect(line).toMatch(/max-width\s*:/);
    }
    // La propia existencia de líneas con vw confirma que el check no es
    // un no-op — hay uso real (max-width:100vw del panel, el pill
    // cerrado) que sigue vigente y sigue siendo seguro.
    expect(lines.length).toBeGreaterThan(0);
  });

  it("no introduce white-space:nowrap en contenedores de layout mobile", () => {
    const nowrapBlocks = mobileCss.match(/([^{}]+)\{[^{}]*white-space:\s*nowrap[^{}]*\}/g) || [];
    for (const block of nowrapBlocks) {
      expect(block).not.toMatch(/public-chat-widget__(?:panel|messages|form|handoff-bar)/);
    }
  });

  // translateY sigue en uso legítimo acá (centrado vertical del riel del
  // launcher cerrado, position:fixed, no relacionado con overflow) — el
  // riesgo real de overflow horizontal es específicamente translateX,
  // que el bloque mobile no debe declarar de forma directa.
  it("el bloque mobile no declara translateX (fuente clásica de overflow horizontal fantasma)", () => {
    expect(mobileCss).not.toMatch(/translateX\s*\(/);
  });

  it("el bloque mobile no introduce márgenes negativos", () => {
    expect(mobileCss).not.toMatch(/margin[a-z-]*:\s*-\d/);
  });

  it("ninguna regla de layout del chat/prechat fija un width en px fuera de controles pequeños conocidos (el rail del toggle cerrado)", () => {
    const matches = [...mobileCss.matchAll(/(?<!max-|min-)width:\s*(\d+)px/g)];
    for (const match of matches) {
      const px = Number(match[1]);
      // El único width fijo esperado en mobile es el riel del toggle
      // cerrado (52px, un botón circular, no una fila de contenido que
      // pueda desbordar el viewport).
      expect(px).toBeLessThanOrEqual(60);
    }
  });
});

describe("PublicChatWidget mobile — smoke check de scrollWidth/clientWidth (NO prueba geometría real)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false });
    getPublicAvatarRuntime.mockResolvedValue(null);
    recognizeVisitor.mockResolvedValue({ recognized: false, full_name: null, email: null, phone: null });
    vi.stubGlobal("innerWidth", 390);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function assertNoTrivialOverflow(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      expect(el, `expected ${selector} to exist in the DOM`).not.toBeNull();
      // jsdom has no layout engine: scrollWidth/clientWidth are 0 for
      // every element, so this comparison is trivially true. It is kept
      // only so a future structural regression (the element disappearing
      // entirely) fails loudly here — it is not evidence of real-device
      // overflow-free layout.
      expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth || el.scrollWidth);
    }
  }

  it("panel + prechat + botón primario existen en el DOM (pantalla pre-chat)", async () => {
    render(<PublicChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));
    await screen.findByRole("dialog");

    assertNoTrivialOverflow([
      ".public-chat-widget__panel",
      ".public-chat-widget__messages--prechat",
      ".public-chat-widget__prechat-actions",
      ".public-chat-widget__action-btn--primary",
    ]);
  });

  it("panel + handoff-bar + composer existen en el DOM y no hay quick replies", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));
    await screen.findByRole("dialog");
    await screen.findByLabelText(/escribe tu mensaje/i);

    assertNoTrivialOverflow([
      ".public-chat-widget__panel",
      ".public-chat-widget__handoff-bar",
      ".public-chat-widget__form",
    ]);
    expect(document.querySelector(".public-chat-widget__quick-actions")).toBeNull();
  });
});
