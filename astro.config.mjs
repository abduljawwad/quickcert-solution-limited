// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

// Vite stays on 6 so this plugin and Astro 5 share one Vite install.

const { PUBLIC_SITE_URL } = loadEnv(
  process.env.NODE_ENV === "production" ? "production" : "development",
  process.cwd(),
  "PUBLIC_",
);

// Pages stay prerendered. The Node adapter serves the on-demand /api/quote and /api/lead routes.
const site = (PUBLIC_SITE_URL || "https://quickcertsolutions.co.uk").replace(/\/$/, "");
const siteHostname = new URL(site).hostname;

export default defineConfig({
  site,
  output: "static",
  adapter: node({
    mode: "standalone",
  }),
  // An empty allow list makes Astro rewrite the request host to localhost, so a
  // same-origin form post never matches the origin check. These hosts keep that
  // check working for the no-JavaScript /api/quote and /api/lead fallbacks.
  security: {
    allowedDomains: [
      { hostname: "localhost" },
      { hostname: "127.0.0.1" },
      { hostname: siteHostname },
    ],
  },
  integrations: [
    sitemap({
      filter(page) {
        const pathname = new URL(page).pathname.replace(/\/+$/, "") || "/";
        return (
          pathname !== "/booking/confirmation" &&
          pathname !== "/review" &&
          !pathname.startsWith("/book/")
        );
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
