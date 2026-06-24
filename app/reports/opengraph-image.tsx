import { ImageResponse } from "next/og";

import { catalogEntryTitle, loadCanonicalRawCatalogEntries } from "../lib/catalog-data";
import { CATALOG_OG_CONTENT_TYPE, CATALOG_OG_SIZE, buildCatalogOgCard } from "../lib/catalog-og";

const DATA_FILE = "monty-reports.json";

export const dynamic = "force-static";
export const alt = "Reports by Velimir V. Vesselinov";
export const size = CATALOG_OG_SIZE;
export const contentType = CATALOG_OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  const entries = loadCanonicalRawCatalogEntries(DATA_FILE);
  const count = entries.length;
  const tags = ["Technical reports", "Downloads", "Research", `${count} entries`];

  return new ImageResponse(
    buildCatalogOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title: "Reports",
      detail: `${count} technical reports and downloadable research documents`,
      byline: entries.slice(0, 3).map((entry) => catalogEntryTitle(entry)).filter(Boolean).join(" • "),
      description: "Technical reports spanning groundwater, environmental management, hydrology, model diagnostics, and related scientific investigations.",
      tags,
      footer: "montyv.github.io/reports",
      accentColor: "#a78bfa",
      label: "Report",
    }),
    {
      ...size,
    },
  );
}
