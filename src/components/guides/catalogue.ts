import { business } from "../../config/business";

export interface GuidePage {
  href: string;
  /** Short name for breadcrumbs, the index, and in-page links. */
  label: string;
  title: string;
  description: string;
  /** One sentence on the guides index. */
  summary: string;
}

export const guidePages = [
  {
    href: "/guides/do-i-need-an-epc",
    label: "When a home needs an EPC",
    title: `When a home in ${business.baseTown} needs an EPC`,
    description: `A domestic EPC is needed before marketing a home in ${business.baseTown} for sale. Landlords must meet a minimum EPC band. The assessor visits and emails the certificate.`,
    summary: "When a domestic EPC is needed to sell a home, and the minimum band for a landlord.",
  },
  {
    href: "/guides/domestic-and-commercial-epc",
    label: "Domestic EPC or commercial EPC",
    title: "The difference between a domestic EPC and a commercial EPC",
    description: `A domestic EPC is for a home. A commercial EPC is for a shop, office, or other commercial building. They are different certificates, each booked on its own page.`,
    summary: "Which certificate is for a home, and which is for a shop, office, or other commercial building.",
  },
  {
    href: "/guides/legionella-assessment-rented-home",
    label: "Legionella assessment for a rented home",
    title: `What a Legionella assessment of a rented home in ${business.baseTown} involves`,
    description: `What a Legionella assessment of a rented home in ${business.baseTown} involves: a visit to look at the water system, then a written assessment by email.`,
    summary: "What the assessor looks at in the water system of a rented home, and what is emailed afterwards.",
  },
  {
    href: "/guides/what-a-fire-risk-assessment-covers",
    label: "What a fire risk assessment covers",
    title: `What a fire risk assessment visit in ${business.baseTown} covers`,
    description: `What this fire risk assessment visit in ${business.baseTown} covers: hazards, escape routes, and the alarms and fire doors already there. The written assessment is emailed.`,
    summary: "What the assessor looks at on the visit, and the written fire risk assessment you receive.",
  },
  {
    href: "/guides/pat-testing-for-landlords",
    label: "PAT testing for a landlord",
    title: `What PAT testing covers for a landlord in ${business.baseTown}`,
    description: `PAT testing for a landlord in ${business.baseTown} covers portable appliances supplied in a rented home. An EICR for the fixed wiring is quoted separately.`,
    summary: "Which portable appliances a landlord's PAT testing visit covers, and how an EICR is different.",
  },
  {
    href: "/guides/landlord-compliance-checklist",
    label: "Landlord compliance checklist",
    title: `Which services a landlord in ${business.baseTown} may need`,
    description: `A short checklist for ${business.baseTown} landlords: domestic EPC, legionella and fire risk assessments, inventory, PAT testing, and when to request quotes for electrical or plumbing work.`,
    summary: "A short list of the certificates, reports, and quotes a landlord may need, with a link to each service.",
  },
] as const satisfies readonly GuidePage[];

export function guideByHref(href: (typeof guidePages)[number]["href"]): GuidePage {
  const guide = guidePages.find((item) => item.href === href);
  if (!guide) {
    throw new Error(`Missing guide: ${href}`);
  }
  return guide;
}
