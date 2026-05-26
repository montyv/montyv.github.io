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
    file: path.join("app", "publications", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /imagePath:\s*PUBLICATIONS_OG_IMAGE/, message: "must use publications OG image" },
      { test: /buildCollectionPageJsonLd\(/, message: "must include collection JSON-LD" },
    ],
  },
  {
    file: path.join("app", "publications", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
      { test: /imagePath:\s*`\$\{PAGE_PATH\}\/\$\{slug\}\/opengraph-image`/, message: "must use per-publication OG image" },
    ],
  },
  {
    file: path.join("app", "presentations", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /imagePath:\s*PRESENTATIONS_OG_IMAGE/, message: "must use presentations OG image" },
      { test: /buildCollectionPageJsonLd\(/, message: "must include collection JSON-LD" },
    ],
  },
  {
    file: path.join("app", "presentations", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
      { test: /imagePath:\s*`\$\{PAGE_PATH\}\/\$\{slug\}\/opengraph-image`/, message: "must use per-presentation OG image" },
    ],
  },
  {
    file: path.join("app", "reports", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /imagePath:\s*REPORTS_OG_IMAGE/, message: "must use reports OG image" },
      { test: /buildCollectionPageJsonLd\(/, message: "must include collection JSON-LD" },
    ],
  },
  {
    file: path.join("app", "reports", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /openGraphType:\s*"article"/, message: "must set article Open Graph type" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
      { test: /imagePath:\s*`\$\{PAGE_PATH\}\/\$\{slug\}\/opengraph-image`/, message: "must use per-report OG image" },
    ],
  },
  {
    file: path.join("app", "software", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /buildCollectionPageJsonLd\(/, message: "must include collection JSON-LD" },
      { test: /imagePath:\s*SOFTWARE_OG_IMAGE_PATH/, message: "must use software OG image" },
    ],
  },
  {
    file: path.join("app", "software", "[slug]", "page.tsx"),
    required: [
      { test: /buildPageMetadata\(/, message: "must use shared metadata builder" },
      { test: /"@type"\s*:\s*"SoftwareApplication"/, message: "must include SoftwareApplication JSON-LD" },
      { test: /url:\s*canonicalUrl\(/, message: "must use canonicalUrl in JSON-LD" },
      { test: /imagePath:\s*softwareOgImagePath\(/, message: "must use per-software OG image" },
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
