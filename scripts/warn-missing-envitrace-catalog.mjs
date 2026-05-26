import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.MONTY_CATALOG_DATA_DIR
  ? path.resolve(process.env.MONTY_CATALOG_DATA_DIR)
  : path.resolve(repoRoot, "..", "EnviTraceJS", "data");

const requiredFiles = [
  "monty publications.json",
  "monty presentations.json",
];

const missingFiles = requiredFiles.filter((fileName) => !fs.existsSync(path.join(dataDir, fileName)));

if (missingFiles.length > 0) {
  const target = dataDir.replace(/\\/g, "/");
  const details = missingFiles.join(", ");
  // eslint-disable-next-line no-console
  console.warn(`[build] Warning: shared EnviTraceJS catalog data not found at ${target} (${details}). montyv.github.io publications/presentations will build without the shared Monty JSON source.`);
}