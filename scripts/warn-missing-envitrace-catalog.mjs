import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "monty-publications.json",
  "monty presentations.json",
  "monty reports.json",
];

const candidateDirs = [
  path.resolve(repoRoot, "app", "data"),
  process.env.MONTY_CATALOG_DATA_DIR ? path.resolve(process.env.MONTY_CATALOG_DATA_DIR) : null,
  path.resolve(repoRoot, "..", "EnviTraceJS", "data"),
].filter(Boolean);

const resolvedDir = candidateDirs.find((candidateDir) => {
  return requiredFiles.every((fileName) => fs.existsSync(path.join(candidateDir, fileName)));
});

if (!resolvedDir) {
  const locations = candidateDirs.map((candidateDir) => candidateDir.replace(/\\/g, "/")).join(", ");
  // eslint-disable-next-line no-console
  console.warn(
    `[build] Warning: Monty catalog data not found in any configured location (${locations}). montyv.github.io publications/presentations/reports will build without the shared Monty JSON source.`,
  );
}