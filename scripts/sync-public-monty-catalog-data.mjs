import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const catalogMappings = [
  {
    source: path.join(repoRoot, "app", "data", "monty-publications.json"),
    target: path.join(repoRoot, "public", "data", "monty-publications.json"),
  },
  {
    source: path.join(repoRoot, "app", "data", "monty-presentations.json"),
    target: path.join(repoRoot, "public", "data", "monty-presentations.json"),
  },
  {
    source: path.join(repoRoot, "app", "data", "monty-reports.json"),
    target: path.join(repoRoot, "public", "data", "monty-reports.json"),
  },
];

let copied = 0;
for (const { source, target } of catalogMappings) {
  if (!fs.existsSync(source)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  copied += 1;
}

// eslint-disable-next-line no-console
console.log(`[catalog] synced ${copied} public Monty catalog file(s)`);
