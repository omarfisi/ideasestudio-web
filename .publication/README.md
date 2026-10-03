# Publication Safety System

Every production PR must target the product branch (`ideas-main` or `jj-pega-main`) and include `.publication/release-manifest.json` in the PR diff.

The manifest declares the product, source branch, target branch, production project and expected file scope. Shared files require explicit approval and CODEOWNERS review. Production publishing from a dirty checkout is prohibited.

Normal production flow:
1. create a clean branch from the product base;
2. add/update `.publication/release-manifest.json`;
3. open PR to the product base;
4. wait for Publication Safety gates;
5. merge only after required review/checks;
6. Vercel deploys only the product production branch.
