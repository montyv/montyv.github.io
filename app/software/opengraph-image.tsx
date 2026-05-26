import { ImageResponse } from "next/og";

import { loadSoftwareEntries } from "../lib/software-data";
import { SOFTWARE_OG_CONTENT_TYPE, SOFTWARE_OG_SIZE, buildSoftwareCollectionOgCard } from "./software-og";

export const dynamic = "force-static";
export const alt = "Software catalog by Velimir V. Vesselinov";
export const size = SOFTWARE_OG_SIZE;
export const contentType = SOFTWARE_OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return new ImageResponse(buildSoftwareCollectionOgCard(loadSoftwareEntries()), {
    ...size,
  });
}
