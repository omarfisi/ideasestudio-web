import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath = '.publication/release-manifest.json';
const changedPath = process.env.PUBLICATION_CHANGED_FILES || '.publication/changed-files.txt';
const base = process.env.PUBLICATION_BASE_BRANCH || process.env.GITHUB_BASE_REF || '';
const head = process.env.PUBLICATION_SOURCE_BRANCH || process.env.GITHUB_HEAD_REF || '';

function fail(msg) {
  console.error(`PUBLICATION_MANIFEST=FAIL ${msg}`);
  process.exit(1);
}
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*\*/g, '___DOUBLE___').replace(/\*/g, '[^/]*').replace(/___DOUBLE___/g, '.*') + '$');
}
function matches(file, patterns = []) { return patterns.some((p) => globToRegExp(p).test(file)); }

if (!base) fail('missing protected base branch');
if (!head) fail('missing source branch');
if (!fs.existsSync(manifestPath)) fail('missing .publication/release-manifest.json');
if (!fs.existsSync(changedPath)) fail(`missing changed-file list ${changedPath}`);
const changed = fs.readFileSync(changedPath, 'utf8').split(/\r?\n/).filter(Boolean);
if (!changed.includes(manifestPath)) fail('release manifest must be changed in every production PR');

let policyText;
try {
  policyText = execFileSync(
    'git',
    ['show', `origin/${base}:.publication/policy.json`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch {
  fail(`cannot load protected policy from origin/${base}`);
}
const policy = JSON.parse(policyText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const productPolicy = Object.values(policy).find((p) => p && p.base_branch === base);
if (!productPolicy) fail(`unsupported base branch ${base}`);
if (!productPolicy.source_branch_prefix) fail(`protected policy for ${base} is missing source_branch_prefix`);

for (const key of ['product','source_branch','base_branch','production_project','visual_baseline','public_workspace_id','expected_files','forbidden_files']) {
  if (!(key in manifest)) fail(`missing field ${key}`);
}
if (manifest.product !== productPolicy.product) fail(`product ${manifest.product} does not match ${productPolicy.product}`);
if (manifest.source_branch !== head) fail(`source_branch ${manifest.source_branch} does not match ${head}`);
if (!head.startsWith(productPolicy.source_branch_prefix)) fail(`source branch ${head} must start with ${productPolicy.source_branch_prefix}`);
if (manifest.base_branch !== base) fail(`base_branch ${manifest.base_branch} does not match ${base}`);
if (manifest.production_project !== productPolicy.production_project) fail(`production_project ${manifest.production_project} does not match ${productPolicy.production_project}`);
if (manifest.public_workspace_id !== productPolicy.public_workspace_id) fail('public_workspace_id does not match protected policy');
if (!Array.isArray(manifest.expected_files) || manifest.expected_files.length === 0) fail('expected_files must be non-empty');
if (!Array.isArray(manifest.forbidden_files)) fail('forbidden_files must be an array');

const scopedChanges = changed.filter((f) => f !== manifestPath);
const unexpected = scopedChanges.filter((f) => !matches(f, manifest.expected_files));
if (unexpected.length) fail(`unexpected files: ${unexpected.join(', ')}`);
const forbidden = scopedChanges.filter((f) => matches(f, manifest.forbidden_files));
if (forbidden.length) fail(`forbidden files: ${forbidden.join(', ')}`);

console.log(`PUBLICATION_MANIFEST=PASS product=${manifest.product} base=${base} source=${head} policy=origin/${base}`);
