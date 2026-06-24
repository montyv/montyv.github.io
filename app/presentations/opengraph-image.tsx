import { ImageResponse } from "next/og";

import { catalogEntryTitle, loadCanonicalRawCatalogEntries } from "../lib/catalog-data";
import { CATALOG_OG_CONTENT_TYPE, CATALOG_OG_SIZE, buildCatalogOgCard } from "../lib/catalog-og";

const DATA_FILE = "monty-presentations.json";

export const dynamic = "force-static";
export const alt = "Presentations by Velimir V. Vesselinov";
export const size = CATALOG_OG_SIZE;
export const contentType = CATALOG_OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  const entries = loadCanonicalRawCatalogEntries(DATA_FILE);
  const count = entries.length;
  const tags = ["Conference talks", "Invited talks", "Slides", `${count} entries`];

  return new ImageResponse(
    buildCatalogOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title: "Presentations",
      detail: `${count} talks, invited presentations, and slide decks`,
      byline: entries.slice(0, 3).map((entry) => catalogEntryTitle(entry)).filter(Boolean).join(" • "),
      description: "Presentations covering AI/ML, geoscience, environmental management, uncertainty quantification, and decision-support workflows.",
      tags,
      footer: "montyv.github.io/presentations",
      accentColor: "#f59e0b",
      label: "Presentation",
    }),
    {
      ...size,
    },
  );
}
