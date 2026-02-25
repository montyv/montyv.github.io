import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, ".next-sitemap");
const outDir = path.join(repoRoot, "out");

const copyIfExists = (fileName) => {
  const src = path.join(sourceDir, fileName);
  const dst = path.join(outDir, fileName);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dst);
  return true;
};

const main = () => {
  fs.mkdirSync(outDir, { recursive: true });

  const entries = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir, { withFileTypes: true })
    : [];

  let copied = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "robots.txt" || /^sitemap.*\.xml$/.test(entry.name)) {
      if (copyIfExists(entry.name)) copied += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[sitemap] copied ${copied} file(s) to out/`);
};

main();
