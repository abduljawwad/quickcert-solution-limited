import { business } from "../config/business";

export function placeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `place-${slug}`;
}

export function areaServedPlaces(): { "@type": "Place"; name: string }[] {
  return business.areas.map((name) => ({ "@type": "Place", name }));
}
