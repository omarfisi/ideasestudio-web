import fs from 'node:fs';
import path from 'node:path';
const policy = JSON.parse(fs.readFileSync('.publication/policy.json','utf8'));
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['dist'];
const ignore = new Set(['.publication/policy.json']);
const bad=[];
function walk(p){
  if(!fs.existsSync(p)) return;
  const st=fs.statSync(p);
  if(st.isDirectory()) { for(const n of fs.readdirSync(p)) walk(path.join(p,n)); return; }
  if(ignore.has(p)) return;
  let text; try { text=fs.readFileSync(p,'utf8'); } catch { return; }
  for(const token of policy.placeholder_tokens||[]) if(text.includes(token)) bad.push(`${p}: ${token}`);
}
for(const root of roots) walk(root);
if(bad.length){ console.error('PLACEHOLDER_SCAN=FAIL'); for(const x of bad) console.error(x); process.exit(1); }
console.log('PLACEHOLDER_SCAN=PASS');
