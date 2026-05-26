import fs from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";

import type { SoftwareEntry } from "../lib/software-data";

export const SOFTWARE_OG_IMAGE_PATH = "/software/opengraph-image";
export const SOFTWARE_OG_CONTENT_TYPE = "image/png";
export const SOFTWARE_OG_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const softwareOgImagePath = (slug: string): string => {
  return `/software/${slug}/opengraph-image`;
};

const CARD_BG = "linear-gradient(135deg, #020617 0%, #0f172a 50%, #172554 100%)";
const PANEL_BG = "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.84) 100%)";
const BORDER = "1px solid rgba(148, 163, 184, 0.28)";

const truncateCardText = (value: string, maxLength: number): string => {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 3) return normalized.slice(0, maxLength);
  return `${normalized.slice(0, maxLength - 3).replace(/[\s,;:.!?-]+$/g, "")}...`;
};

const getMimeType = (pathname: string): string => {
  const extension = path.extname(pathname).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
};

export const getPublicAssetDataUri = (pathname?: string | null): string | undefined => {
  if (!pathname) return undefined;

  const normalized = pathname.replace(/^\/+/, "");
  const assetPath = path.join(process.cwd(), "public", normalized);
  if (!fs.existsSync(assetPath)) return undefined;

  const buffer = fs.readFileSync(assetPath);
  return `data:${getMimeType(assetPath)};base64,${buffer.toString("base64")}`;
};

type SoftwareOgCardOptions = {
  eyebrow: string;
  title: string;
  detail?: string;
  description: string;
  tags?: string[];
  logoDataUri?: string;
  secondaryLogoDataUris?: string[];
  footer?: string;
};

export const buildSoftwareOgCard = ({
  eyebrow,
  title,
  detail,
  description,
  tags,
  logoDataUri,
  secondaryLogoDataUris,
  footer = "montyv.github.io/software",
}: SoftwareOgCardOptions): ReactElement => {
  const safeTags = (tags ?? []).slice(0, 4);
  const secondaryLogos = (secondaryLogoDataUris ?? []).slice(0, 3);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 42,
        background: CARD_BG,
        color: "#e2e8f0",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: 28,
          border: BORDER,
          background: PANEL_BG,
          padding: "36px 40px",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.45)",
          justifyContent: "space-between",
          gap: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: logoDataUri || secondaryLogos.length ? "68%" : "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "#38bdf8",
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 70,
                lineHeight: 1.05,
                fontWeight: 800,
                color: "#f8fafc",
              }}
            >
              {truncateCardText(title, 42)}
            </div>
            {detail ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  lineHeight: 1.2,
                  color: "#cbd5e1",
                }}
              >
                {truncateCardText(detail, 70)}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                color: "#cbd5e1",
                maxWidth: "100%",
              }}
            >
              {truncateCardText(description, 190)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {safeTags.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {safeTags.map((tag) => (
                  <div
                    key={tag}
                    style={{
                      display: "flex",
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "1px solid rgba(56, 189, 248, 0.38)",
                      background: "rgba(15, 23, 42, 0.55)",
                      fontSize: 21,
                      color: "#e2e8f0",
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#94a3b8",
              }}
            >
              {footer}
            </div>
          </div>
        </div>

        {logoDataUri || secondaryLogos.length ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              width: "32%",
              height: "100%",
              padding: "8px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 280,
                height: 220,
                borderRadius: 28,
                background: "rgba(2, 6, 23, 0.42)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                padding: 24,
              }}
            >
              {logoDataUri ? (
                <img
                  src={logoDataUri}
                  alt="Software logo"
                  style={{
                    display: "flex",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 140,
                    height: 140,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    fontSize: 40,
                    fontWeight: 700,
                  }}
                >
                  M
                </div>
              )}
            </div>

            {secondaryLogos.length ? (
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {secondaryLogos.map((secondaryLogoDataUri, index) => (
                  <div
                    key={`${secondaryLogoDataUri}-${index}`}
                    style={{
                      display: "flex",
                      width: 92,
                      height: 92,
                      borderRadius: 20,
                      background: "rgba(2, 6, 23, 0.42)",
                      border: "1px solid rgba(148, 163, 184, 0.16)",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 14,
                    }}
                  >
                    <img
                      src={secondaryLogoDataUri}
                      alt="Software logo"
                      style={{
                        display: "flex",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const buildSoftwareCollectionOgCard = (software: SoftwareEntry[]): ReactElement => {
  const featured = software.filter((entry) => entry.featured).slice(0, 3);
  const [primary, ...secondary] = featured;

  return buildSoftwareOgCard({
    eyebrow: "Velimir V. Vesselinov",
    title: "Software Catalog",
    detail: "Open-source scientific software and computational tools",
    description:
      "Explore SmartTensors, MADS, WELLS, and related tools for science-informed AI, model diagnostics, uncertainty quantification, and groundwater analysis.",
    tags: featured.map((entry) => entry.name),
    logoDataUri: getPublicAssetDataUri(primary?.logo),
    secondaryLogoDataUris: secondary
      .map((entry) => getPublicAssetDataUri(entry.logo))
      .filter((value): value is string => Boolean(value)),
  });
};
