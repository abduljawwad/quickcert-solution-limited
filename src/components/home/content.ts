export const paymentSentences = [
  "The price on the page is the price charged.",
  "Payment is on a secure Stripe page.",
  "A receipt arrives immediately.",
  "Cancel more than 24 hours before the visit for a full refund, issued by the team in Stripe.",
] as const;

export const quoteClarification =
  "Electrical work and plumbing are priced with a written quote before you pay.";

/** Shared outcome for every priced visit. Do not repeat it on each service card. */
export const visitOutcome =
  "An assessor visits the property, performs the assessment, and emails the report.";

export const faqs = [
  {
    question: "How does payment work?",
    answer: `${paymentSentences[0]} ${paymentSentences[1]} ${paymentSentences[2]}`,
  },
  {
    question: "How do I cancel?",
    answer: paymentSentences[3],
  },
  {
    question: "What is the difference between a booked visit and a quote?",
    answer: `A booked visit has one price. You pay that price, we visit, and we email the report. ${quoteClarification}`,
  },
] as const;

export function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answer,
      },
    })),
  };
}
