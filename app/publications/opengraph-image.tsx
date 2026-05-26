import { ImageResponse } from "next/og";

import { catalogEntryTitle, loadCanonicalRawCatalogEntries } from "../lib/catalog-data";
import { CATALOG_OG_CONTENT_TYPE, CATALOG_OG_SIZE, buildCatalogOgCard } from "../lib/catalog-og";

const DATA_FILE = "monty publications.json";

export const dynamic = "force-static";
export const alt = "Publications by Velimir V. Vesselinov";
export const size = CATALOG_OG_SIZE;
export const contentType = CATALOG_OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  const entries = loadCanonicalRawCatalogEntries(DATA_FILE);
  const count = entries.length;
  const tags = ["Peer-reviewed", "AI/ML", "Geoscience", `${count} entries`];

  return new ImageResponse(
    buildCatalogOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title: "Publications",
      detail: `${count} peer-reviewed publications and linked scholarly works`,
      byline: entries.slice(0, 3).map((entry) => catalogEntryTitle(entry)).filter(Boolean).join(" • "),
      description: "Research publications across AI/ML, geoscience, hydrology, environmental management, uncertainty quantification, and model diagnostics.",
      tags,
      footer: "montyv.github.io/publications",
      accentColor: "#22c55e",
      label: "Scholarly Work",
    }),
    {
      ...size,
    },
  );
}
