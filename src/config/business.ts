export type ServiceKind = "book" | "quote";

interface ServiceBase {
  slug: string;
  name: string;
  summary: string;
  calendlyUrl: string;
}

export type Service =
  | (ServiceBase & { kind: "book"; pricePence: number })
  | (ServiceBase & { kind: "quote"; pricePence?: undefined });

export interface Business {
  legalName: string;
  shortName: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  /** Plain-language hours, including which days they apply. */
  hours: string;
  /** 24-hour clock, used in opening-hours data. */
  opens: string;
  closes: string;
  companyNumber: string;
  registeredOffice: string;
  streetAddress: string;
  postalCode: string;
  /** Part of the UK where the company is registered, for example "England and Wales". */
  registeredIn: string;
  /** Short phrase for sentences. The full place list is `areas`. */
  serviceAreaPhrase: string;
  /** Empty until the company is VAT registered. Do not invent a number. */
  vatNumber: string;
  googleReviewUrl: string;
  baseTown: string;
  areas: readonly string[];
  services: readonly Service[];
}

/**
 * Single source for business details.
 * VAT number and the Google review URL are placeholders until supplied.
 * Company number and registered office match the Companies House record.
 * Bookable prices are integer pence.
 */
export const business = {
  legalName: "QuickCert Solution Limited",
  shortName: "QuickCert",
  phoneDisplay: "+44 (0) 746 302 6505",
  phoneHref: "tel:+447463026505",
  email: "info@quickcertsolutions.co.uk",
  hours: "8am to 10pm",
  opens: "08:00",
  closes: "22:00",
  companyNumber: "17039364",
  registeredOffice: "129 Signals Drive, Coventry, CV3 1QD, England",
  streetAddress: "129 Signals Drive",
  postalCode: "CV3 1QD",
  registeredIn: "England and Wales",
  serviceAreaPhrase: "the West Midlands, Leicester, Nottingham, Peterborough, and London",
  vatNumber: "",
  googleReviewUrl: "",
  baseTown: "Coventry",
  areas: [
    "Coventry",
    "Bedworth",
    "Kenilworth",
    "Warwick",
    "Royal Leamington Spa",
    "Rugby",
    "Nuneaton",
    // Coventry districts. They belong on this list only.
    "Earlsdon",
    "Finham",
    "Tile Hill",
    // Main West Midlands cities people search for. The areas page also says the rest of the region is covered.
    "Birmingham",
    "Solihull",
    "Wolverhampton",
    "Walsall",
    "Dudley",
    "West Bromwich",
    "Leicester",
    "Nottingham",
    "Peterborough",
    "London",
  ],
  services: [
    {
      slug: "epc-domestic",
      name: "Domestic EPC",
      summary:
        "A domestic energy performance certificate for a home.",
      kind: "book",
      pricePence: 6500,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/domestic-epc",
    },
    {
      slug: "legionella-risk-assessment",
      name: "Legionella Risk Assessment",
      summary:
        "A written assessment of legionella risk from the water system.",
      kind: "book",
      pricePence: 9500,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/legionella-risk-assessment",
    },
    {
      slug: "fire-risk-assessment",
      name: "Fire Risk Assessment",
      summary:
        "A written fire risk assessment.",
      kind: "book",
      pricePence: 14900,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/fire-risk-assessment",
    },
    {
      slug: "inventory",
      name: "Inventory check-in and check-out",
      summary:
        "A record of the property's condition at check-in or check-out.",
      kind: "book",
      pricePence: 9900,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/inventory-check-in-check-out",
    },
    {
      slug: "pat-testing",
      name: "PAT testing",
      summary:
        "Testing of portable electrical appliances.",
      kind: "book",
      pricePence: 6900,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/pat-testing",
    },
    {
      slug: "epc-commercial",
      name: "Commercial EPC",
      summary:
        "An energy performance certificate for a commercial building.",
      kind: "book",
      pricePence: 19900,
      calendlyUrl: "https://calendly.com/quickcertsolutions-info/commercial-epc",
    },
    {
      slug: "electrical",
      name: "Electrical work",
      summary: "Electrical work, priced in writing before any payment.",
      kind: "quote",
      calendlyUrl: "",
    },
    {
      slug: "plumbing",
      name: "Plumbing",
      summary: "Plumbing work, priced in writing before any payment.",
      kind: "quote",
      calendlyUrl: "",
    },
  ],
} satisfies Business;

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Opening hours for search engines. Every day, with no holiday closure. */
export function openingHoursSpecification() {
  return {
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: weekdays.map((day) => `https://schema.org/${day}`),
    opens: business.opens,
    closes: business.closes,
  };
}
