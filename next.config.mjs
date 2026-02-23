/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow running `next dev` alongside a build by using a separate distDir.
  // IMPORTANT: only set `distDir` when explicitly requested; otherwise Next's
  // default output/export behavior should remain intact.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
