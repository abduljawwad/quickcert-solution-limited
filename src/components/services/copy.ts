import { guideByHref } from "../guides/catalogue";
import { business } from "../../config/business";

export interface ServiceLink {
  href: string;
  label: string;
}

export interface ServiceCopy {
  description: string;
  what: readonly string[];
  who: readonly string[];
  receive: readonly string[];
  guides: readonly ServiceLink[];
  /** Other service pages named in the copy. */
  also?: readonly ServiceLink[];
}

const coventryDistricts = ["Earlsdon", "Finham", "Tile Hill"] as const;

function formatList(items: readonly string[]): string {
  return new Intl.ListFormat("en-GB", {
    style: "long",
    type: "conjunction",
  }).format(items);
}

function guide(href: Parameters<typeof guideByHref>[0]): ServiceLink {
  const page = guideByHref(href);
  return { href: page.href, label: page.label };
}

function servicePage(slug: (typeof business.services)[number]["slug"]): ServiceLink {
  const service = business.services.find((item) => item.slug === slug);
  if (!service) {
    throw new Error(`Missing service: ${slug}`);
  }
  return {
    href: `/services/${service.slug}`,
    label: `${service.name} in ${business.baseTown}`,
  };
}

/**
 * Plain descriptions of the services named in business.ts.
 * Prices stay on the page. Electrical and plumbing stay quote-only.
 */
export const serviceCopy = {
  "epc-domestic": {
    description: `A domestic EPC for a home in ${business.baseTown}. For landlords, sellers, and letting agents. The assessor visits and emails the certificate.`,
    what: [
      "A domestic EPC is an energy performance certificate for a home, such as a house or flat. The assessor visits the property and emails the certificate.",
      "A commercial EPC is the certificate for a shop, office, or other commercial building. That visit is booked on its own page.",
    ],
    who: [
      "Landlords use a domestic EPC when they let a home, and they need to meet a minimum EPC band. Sellers need a domestic EPC before a home is marketed for sale. Letting agents can book the visit for a home they manage.",
    ],
    receive: [
      "You receive the domestic EPC by email after the visit. The price on this page is the price charged. You book and pay from this page.",
    ],
    guides: [guide("/guides/do-i-need-an-epc"), guide("/guides/domestic-and-commercial-epc")],
    also: [servicePage("epc-commercial")],
  },
  "epc-commercial": {
    description: `A commercial EPC for a shop, office, or other commercial building in ${business.baseTown}. Separate from a domestic EPC for a home.`,
    what: [
      "A commercial EPC is an energy performance certificate for a commercial building, such as a shop, office, or other commercial premises. The assessor visits the building and emails the certificate.",
      "A house or flat uses a domestic EPC. That is a separate visit, with its own price.",
    ],
    who: [
      `Landlords, agents, and owners of small commercial units book this visit for premises in ${business.baseTown} and the other places we cover.`,
    ],
    receive: [
      "You receive the commercial EPC by email after the visit. The price on this page is the price charged. You book and pay from this page.",
    ],
    guides: [guide("/guides/domestic-and-commercial-epc")],
    also: [servicePage("epc-domestic")],
  },
  "legionella-risk-assessment": {
    description: `A Legionella risk assessment of the water system in a rented home in ${business.baseTown}. The written assessment is emailed after the visit.`,
    what: [
      "A Legionella risk assessment is a written assessment of Legionella risk from the water system. The assessor visits the property and looks at stored water, hot water, and the taps and showers.",
    ],
    who: [
      "Landlords and letting agents book this visit for a rented house or flat.",
    ],
    receive: [
      "You receive the written Legionella risk assessment by email after the visit. The price on this page is the price charged. You book and pay from this page.",
    ],
    guides: [guide("/guides/legionella-assessment-rented-home")],
  },
  "fire-risk-assessment": {
    description: `A written fire risk assessment in ${business.baseTown}. The visit covers the property as it is, and the assessment is emailed afterwards.`,
    what: [
      "A fire risk assessment is a written assessment of fire risk at the property on the day of the visit. The assessor walks the property, notes fire hazards, and looks at how people would leave, including the escape routes and the alarms and fire doors already there.",
    ],
    who: [
      "Landlords and letting agents book this visit for a rented property. Owners of small commercial units can book the same visit.",
    ],
    receive: [
      "You receive the written fire risk assessment by email after the visit. The price on this page is the price charged. You book and pay from this page. Supplying or fitting alarms and doors is separate from this visit.",
    ],
    guides: [guide("/guides/what-a-fire-risk-assessment-covers")],
  },
  inventory: {
    description: `An inventory of a property's condition at check-in or check-out in ${business.baseTown}. The written record is emailed after the visit.`,
    what: [
      "An inventory is a written record of the property's condition at check-in or check-out. The assessor visits and records the condition of the rooms and the items in them.",
    ],
    who: [
      "Landlords and letting agents use an inventory at the start or end of a tenancy.",
    ],
    receive: [
      "You receive the inventory by email after the visit. The price on this page is the price charged. Book the visit for the check-in or the check-out.",
    ],
    guides: [guide("/guides/landlord-compliance-checklist")],
  },
  "pat-testing": {
    description: `PAT testing of portable appliances for landlords in ${business.baseTown}. Results are emailed. An EICR for the fixed wiring is quoted separately.`,
    what: [
      "PAT testing is a test of portable electrical appliances, such as kettles, toasters, lamps, and other items that plug in. For a landlord, that is the appliances supplied in the rented home.",
      "An electrical installation condition report (EICR) covers the fixed wiring. That is electrical work, quoted in writing, and it is a separate page.",
    ],
    who: [
      "Landlords book PAT testing for appliances they supply in a rented home. Small businesses book it for portable appliances at their premises.",
    ],
    receive: [
      "The assessor tests the portable appliances and emails the results. The price on this page is the price charged. You book and pay from this page.",
    ],
    guides: [guide("/guides/pat-testing-for-landlords")],
    also: [servicePage("electrical")],
  },
  electrical: {
    description: `Electrical work and an EICR in ${business.baseTown}, priced in writing before any payment. No price and no payment on this page.`,
    what: [
      "Electrical work on this page is priced in writing before any payment. That includes an electrical installation condition report (EICR), a written report on the fixed electrical installation, and other electrical work you describe on the form.",
      "PAT testing of portable appliances has its own price on the PAT testing page.",
    ],
    who: [
      `Landlords, letting agents, and homeowners use this page for an EICR or other electrical work at a property in ${business.baseTown} or the other places we cover.`,
    ],
    receive: [
      "You describe the work on the form. We reply with a written quote. You pay only after you accept that quote. There is no price and no payment for electrical work on this website.",
    ],
    guides: [guide("/guides/pat-testing-for-landlords")],
    also: [servicePage("pat-testing")],
  },
  plumbing: {
    description: `Plumbing in ${business.baseTown}, priced in writing before any payment. No price and no payment on this page.`,
    what: [
      "Plumbing on this page is plumbing work at the property. It is priced in writing before any payment.",
    ],
    who: [
      `Landlords, letting agents, and homeowners use this page when they need plumbing at a property in ${business.baseTown} or the other places we cover.`,
    ],
    receive: [
      "You describe the job on the form. We reply with a written quote. You pay only after you accept that quote. There is no price and no payment for plumbing on this website.",
    ],
    guides: [guide("/guides/landlord-compliance-checklist")],
  },
} as const satisfies Record<(typeof business.services)[number]["slug"], ServiceCopy>;

export function copyFor(slug: string): ServiceCopy {
  if (!Object.hasOwn(serviceCopy, slug)) {
    throw new Error(`Missing service explanation: ${slug}`);
  }
  return serviceCopy[slug as keyof typeof serviceCopy];
}

/** Every place already listed in business.ts, in one readable block. */
export function coverageParagraphs(): readonly string[] {
  const districts =
    business.baseTown === "Coventry"
      ? coventryDistricts.filter((name) => business.areas.some((area) => area === name))
      : [];
  const rest = business.areas.filter(
    (name) => name !== business.baseTown && !districts.some((district) => district === name),
  );
  const fromBase =
    districts.length > 0
      ? `Visits are arranged from ${business.baseTown}, including ${formatList(districts)}.`
      : `Visits are arranged from ${business.baseTown}.`;
  if (rest.length === 0) return [fromBase];
  return [
    fromBase,
    `We also cover ${formatList(rest)}. The rest of the West Midlands is covered as well.`,
  ];
}
