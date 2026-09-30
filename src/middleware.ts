import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE, REF_COOKIE_MAX_AGE, isPlausibleRefCode } from "@/lib/affiliates";
import {
  RESEARCH_REF_COOKIE,
  RESEARCH_REF_COOKIE_MAX_AGE,
  isFromResearchReferrer,
} from "@/lib/research-ref";

/**
 * Captures affiliate referrals and research-site referrals on the way in.
 *
 * Runs on every request rather than one route, because either kind of link
 * can land a visitor on any page - the homepage, a product page, a formats
 * page - not only /shop. Whichever page they land on, the signal has to be
 * caught here or it is gone by the time checkout runs.
 *
 * Deliberately does not touch the database: middleware runs on the Edge
 * runtime, where "server-only" libraries like affiliates.ts's Supabase
 * lookup are not available, and a bad or inactive code is harmless to store -
 * findAffiliate() at order time simply finds nothing and no commission is
 * recorded. This only has to validate the *shape* of the code, so a stray
 * "?ref=<script>" never ends up sitting in a cookie.
 *
 * Both checks share one response object and neither is allowed to early-
 * return before the other runs - a visitor with no ?ref= param still needs
 * their Referer header checked, and vice versa.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && isPlausibleRefCode(ref)) {
    // Last-click: a fresh ?ref= always overwrites whatever was there before.
    res.cookies.set(REF_COOKIE, ref.toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE,
    });
  }

  if (isFromResearchReferrer(req.headers.get("referer"))) {
    res.cookies.set(RESEARCH_REF_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RESEARCH_REF_COOKIE_MAX_AGE,
    });
  }

  return res;
}

export const config = {
  // Everything except static assets, images and API/internal routes - those
  // are never where a customer lands from an affiliate link.
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|icon.png|apple-icon.png).*)"],
};
