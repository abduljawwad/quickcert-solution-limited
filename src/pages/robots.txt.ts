import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site ?? "https://quickcertsolutions.co.uk");
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
