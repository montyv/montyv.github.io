# Build / content generation notes

This site is a static Next.js export (`output: "export"`).

## Content indexes (publications / presentations / reports)

Generated indexes are built from:

- `legacy/index.html` (legacy lists)
- `app/<topic>/<topic>.content.json` (curated/manual list)
- `app/<topic>/<topic>.overrides.json` (manual override list)
- PDFs in `public/<folderKey>/*.pdf`

### PDF-generated indexes

Files named `app/<topic>/<topic>.pdf.generated.json` are intended as **helper output**: they only include PDFs that are **not already referenced** by any of:

- the legacy index (`*.legacy.generated.json`)
- the curated content (`*.content.json`)
- the overrides (`*.overrides.json`)

This makes them useful for finding “new PDFs” that exist in `public/` but are not yet listed on the website.

### Opt-in PDF parsing

Parsing PDF metadata/text (via `pdf-parse`) is optional because it can be slow.

- Default: filename-only titles (no PDF parsing)
  - `node scripts/generate-content-index.mjs`

- With PDF parsing enabled:
  - PowerShell: `$env:PARSE_PDFS=1; node scripts/generate-content-index.mjs`
  - Bash: `PARSE_PDFS=1 node scripts/generate-content-index.mjs`
  - Or: `node scripts/generate-content-index.mjs --parse-pdfs`

When PDF parsing is enabled, the generator tries to extract a better title/authors from the PDF; otherwise it falls back to the filename.

## Build

- Dev: `npm run dev`
- Export build: `npm run build`

Note: `npm run build` runs the index generation in `prebuild`.
