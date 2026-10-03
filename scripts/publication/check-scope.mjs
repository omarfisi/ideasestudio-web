import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync('.publication/policy.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('.publication/release-manifest.json', 'utf8'));
const changedPath = process.env.PUBLICATION_CHANGED_FILES || '.publication/changed-files.txt';
const base = process.env.PUBLICATION_BASE_BRANCH || process.env.GITHUB_BASE_REF || '';
const changed = fs.readFileSync(changedPath, 'utf8').split(/\r?\n/).filter(Boolean);

function fail(msg) { console.error(`TENANT_FILE_SCOPE=FAIL ${msg}`); process.exit(1); }
const productPolicy = Object.values(policy).find((p) => p && p.base_branch === base);
if (!productPolicy) fail(`unsupported base ${base}`);

if (base === 'ideas-main') {
  const bad = changed.filter((f) => (productPolicy.forbidden_prefixes || []).some((p) => f.startsWith(p)));
  if (bad.length) fail(`Ideas PR touched JJ paths: ${bad.join(', ')}`);
}
if (base === 'jj-pega-main') {
  const allowed = productPolicy.allowed_prefixes || [];
  const bad = changed.filter((f) => f !== '.publication/release-manifest.json' && !allowed.some((p) => f.startsWith(p)));
  if (bad.length) fail(`JJ PR touched non-JJ paths: ${bad.join(', ')}`);
}

const shared = changed.filter((f) => (policy.shared_hotspots || []).includes(f));
if (shared.length && manifest.shared_files_approved !== true) {
  fail(`shared files require manifest shared_files_approved=true: ${shared.join(', ')}`);
}
if (shared.length) console.log(`SHARED_FILES_REVIEW=REQUIRED files=${shared.join(',')}`);
else console.log('SHARED_FILES_REVIEW=NOT_REQUIRED');
console.log(`TENANT_FILE_SCOPE=PASS product=${manifest.product}`);
