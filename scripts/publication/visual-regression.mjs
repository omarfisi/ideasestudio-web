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
await browser.close();
fs.writeFileSync('.artifacts/visual/report.json',JSON.stringify({ referenceBase,candidateBase,allowVisualChange,results },null,2));
if(failed){ console.error('VISUAL_REGRESSION=FAIL'); process.exit(1); }
console.log(`VISUAL_REGRESSION=PASS approved_override=${allowVisualChange}`);
