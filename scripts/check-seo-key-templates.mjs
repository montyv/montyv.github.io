#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const warnOnly = process.argv.includes("--warn");

const checks = [
  {
    file: path.join("app", "page.tsx"),
    required: [
      { test: /"@type"\s*:\s*"ProfilePage"/, message: "must include ProfilePage JSON-LD" },
      { test: /"@type"\s*:\s*"Person"/, message: "must include Person JSON-LD" },
      { test: /"@type"\s*:\s*"WebSite"/, message: "must include WebSite JSON-LD" },
    ],
  },
  {
    file: path.join("app", "publications", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
    ],
  },
  {
    file: path.join("app", "presentations", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
    ],
  },
  {
    file: path.join("app", "reports", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
    ],
  },
];

const issues = [];

for (const check of checks) {
  const absPath = path.join(root, check.file);
  if (!fs.existsSync(absPath)) {
    issues.push({ file: check.file, message: "file not found" });
    continue;
  }

  const source = fs.readFileSync(absPath, "utf8");
  for (const requirement of check.required) {
    if (!requirement.test.test(source)) {
      issues.push({ file: check.file, message: requirement.message });
    }
  }
}

if (issues.length === 0) {
  console.log("[check-seo-key-templates] Key metadata and JSON-LD template checks passed.");
  process.exit(0);
}

const log = warnOnly ? console.warn : console.error;
const mode = warnOnly ? "WARNING" : "ERROR";
log(`[check-seo-key-templates] ${mode}: Found ${issues.length} issue(s):`);
for (const issue of issues) {
  log(`  ${issue.file}: ${issue.message}`);
}

if (!warnOnly) {
  process.exit(1);
}
