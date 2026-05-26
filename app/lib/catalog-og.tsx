import fs from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";

import { DEFAULT_OG_IMAGE } from "./seo";

export const CATALOG_OG_CONTENT_TYPE = "image/png";
export const CATALOG_OG_SIZE = {
  width: 1200,
  height: 630,
} as const;

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

const getPublicAssetDataUri = (pathname?: string | null): string | undefined => {
  if (!pathname) return undefined;

  const normalized = pathname.replace(/^\/+/, "");
  const assetPath = path.join(process.cwd(), "public", normalized);
  if (!fs.existsSync(assetPath)) return undefined;

  const buffer = fs.readFileSync(assetPath);
  return `data:${getMimeType(assetPath)};base64,${buffer.toString("base64")}`;
};

const PORTRAIT_DATA_URI = getPublicAssetDataUri(DEFAULT_OG_IMAGE);

type CatalogOgCardOptions = {
  eyebrow: string;
  title: string;
  detail?: string;
  description: string;
  byline?: string;
  tags?: string[];
  footer: string;
  accentColor?: string;
  label: string;
};

export const buildCatalogOgCard = ({
  eyebrow,
  title,
  detail,
  description,
  byline,
  tags,
  footer,
  accentColor = "#38bdf8",
  label,
}: CatalogOgCardOptions): ReactElement => {
  const safeTags = (tags ?? []).slice(0, 4);

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
            width: "68%",
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
                color: accentColor,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 68,
                lineHeight: 1.05,
                fontWeight: 800,
                color: "#f8fafc",
              }}
            >
              {truncateCardText(title, 58)}
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
                {truncateCardText(detail, 84)}
              </div>
            ) : null}
            {byline ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  lineHeight: 1.3,
                  color: "#94a3b8",
                }}
              >
                {truncateCardText(byline, 96)}
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
              {truncateCardText(description, 200)}
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
                      border: `1px solid ${accentColor}66`,
                      background: "rgba(15, 23, 42, 0.55)",
                      fontSize: 21,
                      color: "#e2e8f0",
                    }}
                  >
                    {truncateCardText(tag, 28)}
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
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(2, 6, 23, 0.42)",
              border: `1px solid ${accentColor}55`,
              fontSize: 22,
              color: "#f8fafc",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 280,
              height: 280,
              borderRadius: 32,
              background: "rgba(2, 6, 23, 0.42)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              overflow: "hidden",
            }}
          >
            {PORTRAIT_DATA_URI ? (
              <img
                src={PORTRAIT_DATA_URI}
                alt="Velimir V. Vesselinov"
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
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
                  border: `1px solid ${accentColor}66`,
                  color: accentColor,
                  fontSize: 40,
                  fontWeight: 700,
                }}
              >
                V
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
