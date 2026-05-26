import { ImageResponse } from "next/og";

import { getSoftwareBySlug, loadSoftwareEntries } from "../../lib/software-data";
import {
  SOFTWARE_OG_CONTENT_TYPE,
  SOFTWARE_OG_SIZE,
  buildSoftwareOgCard,
  getPublicAssetDataUri,
} from "../software-og";

type SoftwareOgImageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-static";
export const size = SOFTWARE_OG_SIZE;
export const contentType = SOFTWARE_OG_CONTENT_TYPE;

export const generateStaticParams = async () => {
  return loadSoftwareEntries().map((entry) => ({ slug: entry.slug }));
};

export default async function OpenGraphImage({ params }: SoftwareOgImageProps) {
  const { slug } = await params;
  const software = getSoftwareBySlug(slug);

  const title = software?.name ?? "Software";
  const detail = [software?.category, software?.year ? String(software.year) : null].filter(Boolean).join(" • ");
  const description = software?.description ?? software?.summary ?? "Scientific software by Velimir V. Vesselinov.";
  const tags = software?.tags ?? [];

  return new ImageResponse(
    buildSoftwareOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title,
      detail: detail || undefined,
      description,
      tags,
      logoDataUri: getPublicAssetDataUri(software?.logo),
      secondaryLogoDataUris: software?.media
        ?.map((item) => getPublicAssetDataUri(item.src))
        .filter((value): value is string => Boolean(value)),
      footer: software ? `montyv.github.io/software/${software.slug}` : "montyv.github.io/software",
    }),
    {
      ...size,
    },
  );
}
