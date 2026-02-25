/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://montyv.github.io",
  generateRobotsTxt: true,
  outDir: ".next-sitemap",
};
