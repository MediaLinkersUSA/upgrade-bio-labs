import {
  SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  SHIPPING_EXPEDITED,
  SHIP_CUTOFF,
} from "@/lib/config";

/** One source, two outputs: the accordion and the FAQPage JSON-LD. */
export const faqs = [
  {
    q: "How fast do you ship?",
    a: `Orders placed before ${SHIP_CUTOFF} on a business day leave the same day. All orders over $${SHIPPING_THRESHOLD} ship free. We also offer standard ground shipping, 3 to 7 days, for $${SHIPPING_FLAT}, and expedited shipping, 1 to 3 days, for $${SHIPPING_EXPEDITED}.`,
  },
  {
    q: "What does third-party tested actually mean?",
    a: "Every batch is sent to an independent laboratory that has no commercial interest in the result. They run identity by mass spectrometry, purity by HPLC, and net peptide content on every format. Vials additionally carry an endotoxin assay by LAL and a heavy-metals screen by ICP-MS. We publish the document they return, unedited.",
  },
  {
    q: "How do I read a COA?",
    a: "Check these fields. Identity confirms the compound is what the label says. Purity is the HPLC percentage, which should be at or above 99%. Net peptide content tells you how much actual peptide is in the vial as opposed to salts and residual water. On vials you will also see an endotoxin figure, which should read below 0.5 EU/mg, and a heavy-metals screen.",
  },
  {
    q: "What's the difference between vials, sprays, and capsules?",
    a: "Vials contain lyophilized powder that you reconstitute yourself, which gives the widest compound selection and the lowest cost per mg. Sprays arrive pre-mixed with a measured actuation, so there is no reconstitution and no bacteriostatic water needed. Capsules are pre-dosed oral format, the simplest to handle and store.",
  },
  {
    q: "Do I need BAC water and how much?",
    a: "You need bacteriostatic water for any lyophilized vial. Sprays and capsules need none. Volume depends on the concentration your protocol calls for; a 30ml multi-dose vial covers many reconstitutions, and a 3ml vial suits a single one.",
  },
  {
    q: "What's your return policy?",
    a: "All sprays are final sale. Unopened vials and capsules can be returned if unused within 14 days of delivery. If a shipment arrives damaged, lost, or does not arrive at all, we reship at no cost.",
  },
  {
    q: "Where are your peptides made?",
    a: "Everything is manufactured in the United States. Our vials are made by a manufacturer in Arizona, and our sprays and capsules are manufactured in Texas. We do not repackage overseas bulk lots, which is why every batch can be traced from synthesis through to the order it shipped in.",
  },
  {
    q: "Do you offer wholesale or bulk pricing?",
    a: "Yes. Quantity pricing is built into every product page, and the ladder applies automatically at three and five units. For volumes beyond that, contact us directly for a quote.",
  },
] as const;

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};
