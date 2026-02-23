/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow running `next dev` and `next build` concurrently by using different output folders.
  // Our npm scripts set NEXT_DIST_DIR to `.next-dev` and `.next-build`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
