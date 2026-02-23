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
rmIfExists("app/home/home.sections.generated.ts");
rmIfExists("app/home/home.sections.generated.ts.tmp");

// Content index generated JSON (created during prebuild)
walkAndRemove("app", (name) => name.endsWith(".legacy.generated.json") || name.endsWith(".pdf.generated.json"));

// Generated legacy public sync output
rmIfExists("public/legacy/index.html");
