export interface Review {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  headline: string;
  body: string;
  firstName: string;
  lastInitial: string;
  productSlug: string;
  verifiedPurchase: boolean;
  date: string; // ISO
}

/**
 * INTENTIONALLY EMPTY.
 *
 * The reviews section, the hero rating line, and `aggregateRating` schema are
 * all gated on this array. Fabricated reviews in a research-chemical category
 * are a regulatory and trust problem, not a growth tactic, and marking up an
 * aggregateRating that does not exist is a manual-action risk.
 *
 * To launch the section: run a post-purchase review request against the
 * existing order list, then populate this file. Everything downstream turns on
 * automatically once `reviews.length >= MIN_REVIEWS`.
 */
export const reviews: Review[] = [];

/** Below this the section does not render at all. */
export const MIN_REVIEWS = 25;

export const hasReviewCorpus = () => reviews.length >= MIN_REVIEWS;

export const reviewsFor = (slug: string) => reviews.filter((r) => r.productSlug === slug);

export const aggregate = () => {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return {
    count: reviews.length,
    average: +(sum / reviews.length).toFixed(1),
    distribution: ([5, 4, 3, 2, 1] as const).map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    })),
  };
};
