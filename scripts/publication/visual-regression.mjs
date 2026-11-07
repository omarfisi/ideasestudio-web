import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const manifest = JSON.parse(fs.readFileSync('.publication/release-manifest.json','utf8'));
const policy = JSON.parse(fs.readFileSync('.publication/policy.json','utf8'));
const productPolicy = Object.values(policy).find((p) => p?.product === manifest.product);
if (!productPolicy) throw new Error(`Unknown product ${manifest.product}`);
const routes = productPolicy.required_visual_routes || ['/'];
const threshold = Number(productPolicy.max_visual_diff_ratio ?? 0.08);
const referenceBase = String(process.env.PUBLICATION_REFERENCE_BASE || manifest.visual_baseline || '').replace(/\/$/, '');
const candidateBase = String(process.env.PUBLICATION_CANDIDATE_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const labels = new Set(String(process.env.PUBLICATION_LABELS || '').split(',').map((x)=>x.trim()).filter(Boolean));
const allowVisualChange = manifest.visual_change_approved === true && labels.has('visual-change-approved');

if (!/^https?:\/\//.test(referenceBase)) throw new Error('visual reference must be an http(s) URL');
fs.mkdirSync('.artifacts/visual', { recursive: true });

const executablePath = process.env.PUBLICATION_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();

const visualPortfolioFixture = {
  ok: true,
  total: 1,
  items: [{
    id: "publication-visual-fixture",
    title: "Proyecto de prueba visual",
    slug: "proyecto-de-prueba-visual",
    description: "Contenido estable para comparar los builds.",
    category: "diseno",
    client_name: "Cliente de prueba",
    tags: [],
    cover_url: "",
    home_cover_url: "",
    portfolio_cover_url: "",
    media_urls: [],
    is_published: true,
    is_featured: true,
    visual_order: 1,
    placements: ["home", "portfolio_page"],
    section_key: "featured",
    media_kind: "image",
    video_url: ""
  }]
};
let portfolioMode = "success";
let portfolioRequestCount = 0;
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const apiPath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  if (request.method() !== "GET" || !(apiPath === "/portfolio" || apiPath.endsWith("/portfolio"))) {
    return route.continue();
  }
  portfolioRequestCount += 1;
  if (portfolioMode === "error") {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "visual-regression fixture unavailable" })
    });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(visualPortfolioFixture)
  });
});

async function waitForPortfolioRequests(target) {
  const deadline = Date.now() + 10000;
  while (portfolioRequestCount < target && Date.now() < deadline) {
    await page.waitForTimeout(50);
  }
  if (portfolioRequestCount < target) {
    throw new Error(`portfolio retry did not reach fixture: expected=${target} actual=${portfolioRequestCount}`);
  }
}

await page.emulateMedia({ reducedMotion: 'reduce' });

const freezeCss = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  [class*="chat" i], [id*="chat" i], [class*="aira" i], [class*="ivox" i], [class*="assistant" i], iframe { visibility: hidden !important; }
`;

async function capture(base, route, out) {
  const url = new URL(route, `${base}/`).toString();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.addStyleTag({ content: freezeCss });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 5000);
    })));
  });
  await page.waitForTimeout(750);
  await page.screenshot({ path: out, fullPage: true, animations: 'disabled' });
}

function slug(route) { return route === '/' ? 'home' : route.replace(/^\//,'').replaceAll('/','__'); }
const results=[];
let failed=false;

for (const route of routes) {
  const name=slug(route);
  const refPath=path.join('.artifacts/visual', `${name}.reference.png`);
  const candPath=path.join('.artifacts/visual', `${name}.candidate.png`);
  const diffPath=path.join('.artifacts/visual', `${name}.diff.png`);
  await capture(referenceBase, route, refPath);
  await capture(candidateBase, route, candPath);
  const ref=PNG.sync.read(fs.readFileSync(refPath));
  const cand=PNG.sync.read(fs.readFileSync(candPath));
  let ratio=1;
  let reason='dimension_mismatch';
  if (ref.width === cand.width) {
    const heightDelta=Math.abs(ref.height-cand.height)/Math.max(ref.height,cand.height);
    if (ref.height === cand.height || heightDelta <= 0.02) {
      const width=ref.width;
      const height=Math.min(ref.height,cand.height);
      const refCrop=new PNG({ width, height });
      const candCrop=new PNG({ width, height });
      PNG.bitblt(ref,refCrop,0,0,width,height,0,0);
      PNG.bitblt(cand,candCrop,0,0,width,height,0,0);
      const diff=new PNG({ width, height });
      const count=pixelmatch(refCrop.data,candCrop.data,diff.data,width,height,{ threshold:0.15, includeAA:false });
      const pixelRatio=count/(width*height);
      ratio=Math.max(pixelRatio,heightDelta);
      reason=heightDelta ? 'pixel_diff_with_height_tolerance' : 'pixel_diff';
      fs.writeFileSync(diffPath,PNG.sync.write(diff));
    }
  }
  const pass=ratio <= threshold || allowVisualChange;
  if(!pass) failed=true;
  results.push({ route, ratio, threshold, pass, reason });
  console.log(`VISUAL_ROUTE=${route} DIFF_RATIO=${ratio.toFixed(6)} THRESHOLD=${threshold} ${pass?'PASS':'FAIL'}`);
}
portfolioMode = "error";
const requestsBeforeErrorState = portfolioRequestCount;
await page.goto(new URL("/portafolio?visual_regression_error=1", `${candidateBase}/`).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 45000
});
const errorAlert = page.getByRole("alert");
await errorAlert.waitFor({ state: "visible", timeout: 10000 });
if (!(await errorAlert.innerText()).includes("No se pudo cargar el portafolio.")) {
  throw new Error("portfolio error alert text was not rendered");
}
if (portfolioRequestCount !== requestsBeforeErrorState + 1) {
  throw new Error(`expected one portfolio request for error state; got=${portfolioRequestCount - requestsBeforeErrorState}`);
}
await page.getByRole("button", { name: "Reintentar" }).click();
await errorAlert.waitFor({ state: "hidden", timeout: 5000 });
await waitForPortfolioRequests(requestsBeforeErrorState + 2);
await errorAlert.waitFor({ state: "visible", timeout: 10000 });
console.log("PORTFOLIO_ERROR_UI=PASS alert=visible retry=second_request");

await browser.close();
fs.writeFileSync('.artifacts/visual/report.json',JSON.stringify({ referenceBase,candidateBase,allowVisualChange,results },null,2));
if(failed){ console.error('VISUAL_REGRESSION=FAIL'); process.exit(1); }
console.log(`VISUAL_REGRESSION=PASS approved_override=${allowVisualChange}`);
