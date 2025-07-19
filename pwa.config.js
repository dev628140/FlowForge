/** @type {import("@ducanh2912/next-pwa").PWAConfig} */
const config = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  cacheStartUrl: true,
};
 
module.exports = config;
