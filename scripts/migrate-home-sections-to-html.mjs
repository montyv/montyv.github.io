// Deprecated script.
//
// Home sections are now edited directly in:
//   - app/home/sections/*.html
//   - app/home/sections/sections.json
// and compiled into app/home/home.sections.generated.ts via scripts/generate-home-sections.mjs.
//
// This migration helper used to generate those HTML files from an older TS source.
// Per repo policy: NEVER overwrite home section HTML automatically.

// eslint-disable-next-line no-console
console.log("[home] migrate-home-sections-to-html.mjs is deprecated and does nothing.");
// eslint-disable-next-line no-console
console.log("[home] Edit app/home/sections/*.html and app/home/sections/sections.json instead.");
// eslint-disable-next-line no-console
console.log("[home] Then run: node scripts/generate-home-sections.mjs");
