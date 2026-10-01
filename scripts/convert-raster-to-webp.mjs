import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const roots = ["public", "src/assets"];
const textExtensions = new Set([".css", ".html", ".js", ".jsx", ".json", ".md", ".svg", ".ts", ".tsx"]);
const rasterExtensions = new Set([".png", ".jpg", ".jpeg"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

const assetFiles = [];
for (const root of roots) {
  assetFiles.push(...(await walk(path.join(projectRoot, root))));
}

const sourceAssets = assetFiles.filter((file) => {
  const extension = path.extname(file).toLowerCase();
  const relative = path.relative(projectRoot, file);
  return rasterExtensions.has(extension) && !relative.startsWith("public/favicon");
});

const converted = [];
for (const source of sourceAssets) {
  const destination = source.replace(/\.(png|jpe?g)$/i, ".webp");
  await sharp(source).webp({ quality: 86, effort: 5 }).toFile(destination);
  converted.push({ source, destination });
}

const textFiles = (await Promise.all(
  roots.map((root) => walk(path.join(projectRoot, root)))
)).flat();

const uniqueBasenames = new Map();
for (const { source } of converted) {
  const basename = path.basename(source);
  uniqueBasenames.set(basename, (uniqueBasenames.get(basename) || 0) + 1);
}

for (const file of [...new Set(textFiles)]) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;

  const original = await readFile(file, "utf8");
  let updated = original;

  for (const { source, destination } of converted) {
    const sourceRelative = path.relative(projectRoot, source).split(path.sep).join("/");
    const destinationRelative = path.relative(projectRoot, destination).split(path.sep).join("/");

    if (sourceRelative.startsWith("public/")) {
      const publicPath = `/${sourceRelative.slice("public/".length)}`;
      const webpPublicPath = `/${destinationRelative.slice("public/".length)}`;
      updated = updated.split(publicPath).join(webpPublicPath);
    } else if (uniqueBasenames.get(path.basename(source)) === 1) {
      const relativeFromFile = path.relative(path.dirname(file), source).split(path.sep).join("/");
      const relativeWebpFromFile = path.relative(path.dirname(file), destination).split(path.sep).join("/");
      updated = updated.split(relativeFromFile).join(relativeWebpFromFile);
    }
  }

  if (updated !== original) await writeFile(file, updated);
}

console.log(`Converted ${converted.length} local raster images to WebP.`);
