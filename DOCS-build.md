# Build / content generation notes

This site is a static Next.js export (`output: "export"`).

## Content indexes (publications / presentations / reports)

Generated indexes are built from:

- `legacy/index.html` (legacy lists)
- `public/data/monty-publications.json`, `public/data/monty-presentations.json`, and `public/data/monty-reports.json` (public canonical lists used directly by the Next.js pages)
- `app/<topic>/<topic>.content.json` (older curated/manual list; no longer the primary source for publications/presentations pages)
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

Index generation for legacy/PDF helper JSON is **explicit-only**.

The public Monty JSON files live in `public/data/` inside this repo and are served at `https://montyv.github.io/data/`:

- `public/data/monty-publications.json`
- `public/data/monty-presentations.json`
- `public/data/monty-reports.json`

Tracked mirrors also live in `app/data/` with the same hyphenated filenames so builds can refresh the public folder before export.

If the local canonical files are missing, `npm run build` prints a warning before continuing.

`npm run sync:catalog` and `npm run sync:catalog:scholar` write back into the tracked `app/data/` mirrors, and `npm run build` copies them to `public/data/`.

- Generate legacy + PDF index JSON files: `npm run generate:indexes`
- Generate with PDF metadata parsing: `npm run generate:indexes:pdf`

`npm run dev` and `npm run build` do **not** auto-generate these JSON files.

## Deployment

- `.github/workflows/pages.yml` deploys the canonical GitHub Pages site for `montyv.github.io`.
- `.github/workflows/mirror-sites.yml` handles the mirror targets:
  - Builds a static export for `https://montyvesselinov.github.io` and pushes `out/` into `montyvesselinov/montyvesselinov.github.io`.
  - Pushes the source branch to `monty/monty.gitlab.io`, where `.gitlab-ci.yml` builds and publishes `https://monty.gitlab.io`.
- `.gitlab-ci.yml` defaults `SITE_URL` to `https://monty.gitlab.io`; override the CI variable only if the GitLab Pages URL changes.

### Required GitHub Actions configuration

- Repository secret `MONTYVESS_GITHUB_PAT`: PAT with contents write access to the external GitHub repo.
- Repository secret `GITLAB_PUSH_TOKEN`: GitLab token with write access to the target project.
- The workflow currently targets branch `master` on both mirror repositories because `montyvesselinov/montyvesselinov.github.io` and `monty/monty.gitlab.io` both use `master` as their default branch.

### Required target-repo setup

- Initialize the external GitHub Pages repo and make sure its `master` branch already exists.
- Configure that GitHub Pages repo to publish from the same branch that the workflow pushes.
- Create the GitLab project before enabling mirroring from GitHub Actions.
- Enable Git LFS on the GitLab project so mirrored PDFs remain downloadable.

## Home sections (editable HTML)

The home page expandable sections are sourced from editable files under `app/home/sections/*.html` and the index `app/home/sections/sections.json`.

- `scripts/generate-home-sections.mjs` reads those files and generates `app/home/home.sections.generated.ts` used by the homepage.
- Do **not** regenerate `app/home/sections/*.html` from legacy sources during normal workflow.
  - `scripts/migrate-home-sections-to-html.mjs` is a one-time migration helper and will **not overwrite** existing section HTML or `sections.json`.
