import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, ".next-build");
const outDir = path.join(repoRoot, "out");

if (!fs.existsSync(sourceDir)) {
  throw new Error("Expected .next-build to exist after build, but it was not found.");
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(sourceDir, outDir, { recursive: true });

// eslint-disable-next-line no-console
console.log("[build] synced .next-build -> out");
