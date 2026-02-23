import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const rmIfExists = (relPath) => {
  try {
    fs.rmSync(path.join(repoRoot, relPath), { force: true });
  } catch {
    // ignore
  }
};

const walkAndRemove = (dirRel, predicate) => {
  const dirAbs = path.join(repoRoot, dirRel);
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const rel = path.join(dirRel, entry.name);
    const abs = path.join(repoRoot, rel);

    if (entry.isDirectory()) {
      walkAndRemove(rel, predicate);
      continue;
    }

    if (!entry.isFile()) continue;
    if (predicate(entry.name, rel)) {
      try {
        fs.rmSync(abs, { force: true });
      } catch {
        // ignore
      }
    }
  }
};

// Home sections generated TS (created during prebuild)
// NOTE: Do not delete this file here; it is imported by app code and removing it
// breaks dev typechecking / builds after running `npm run build`.
rmIfExists("app/home/home.sections.generated.ts.tmp");

// Content index generated JSON (created during prebuild)
walkAndRemove("app", (name) => name.endsWith(".legacy.generated.json") || name.endsWith(".pdf.generated.json"));

// Generated legacy public sync output
// NOTE: Keep public/legacy/index.html; it is a public route on the site.
