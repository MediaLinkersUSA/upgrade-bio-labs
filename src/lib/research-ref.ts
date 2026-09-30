/**
 * Tracks visitors referred from peptideswellnessresearch.com, the same
 * cookie-based shape as the affiliate ?ref= system in affiliates.ts, just
 * keyed off the HTTP Referer header instead of a query param - there is no
 * code to type, the whole domain is the signal.
 */

export const RESEARCH_REF_COOKIE = "ubl_research_ref";

/** Same window as affiliate attribution (30 days) - no reason for these two
 *  "where did this customer come from" signals to expire on different
 *  schedules. */
export const RESEARCH_REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const RESEARCH_REFERRER_HOST = "peptideswellnessresearch.com";

/**
 * True for any page on that domain or a subdomain of it - "any link from
 * that whole domain", not one specific path. Never throws: a malformed or
 * missing Referer header just means "no match", not an error.
 */
export function isFromResearchReferrer(referer: string | null | undefined): boolean {
  if (!referer) return false;
  try {
    const host = new URL(referer).hostname.toLowerCase();
    return host === RESEARCH_REFERRER_HOST || host.endsWith(`.${RESEARCH_REFERRER_HOST}`);
  } catch {
    return false;
  }
}
