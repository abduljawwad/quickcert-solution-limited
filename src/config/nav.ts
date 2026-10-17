import { business } from "./business";

export interface SiteLink {
  href: string;
  label: string;
}

/** Header and footer share these arrays. Do not copy the lists into components. */
export const primaryNav = [
  { href: "/services", label: "Services" },
  { href: "/guides/do-i-need-an-epc", label: "Guides" },
  { href: "/areas", label: "Areas we cover" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const satisfies readonly SiteLink[];

export const bookVisit = {
  href: "/services",
  label: "Book a visit",
} as const satisfies SiteLink;

export const legalNav = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cancellation", label: "Cancellation" },
] as const satisfies readonly SiteLink[];

export const serviceLinks: SiteLink[] = business.services.map((service) => ({
  href: `/services/${service.slug}`,
  label: service.name,
}));
