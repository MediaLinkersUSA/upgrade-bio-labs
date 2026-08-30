import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/data/products";
import { reviewsFor } from "@/data/reviews";
import { SITE } from "@/lib/config";
import { testStepsFor } from "@/lib/testing";
import { withLivePricing, withLivePricingForAll } from "@/lib/live-pricing";
import Gallery from "@/components/product/Gallery";
import BuyBox from "@/components/product/BuyBox";
import StickyMobileBar from "@/components/product/StickyMobileBar";
import RelatedProducts from "@/components/product/RelatedProducts";
import ShippingAccordion from "@/components/product/ShippingAccordion";
import CoaViewer from "@/components/product/CoaViewer";

export const dynamicParams = false;

// Re-rendered server-side on this schedule rather than per visitor (that
// would hit WooCommerce on every page view) or never (the static build,
// which is what caused prices to flash-update client-side after the page
// had already shown a stale number). A visitor who lands mid-window sees a
// price that is at most this many seconds old, but it is baked into the
// HTML they receive - nothing changes in front of them.
//
// 2 hours, not seconds: WooCommerce is only checked twelve times a day per
// product this way, not on every visit. A price change doesn't have to wait
// out the full window though - the "Update Prices" button in /admin calls
// revalidatePath() and forces every product/shop page to regenerate on the
// next request, immediately. This schedule is the backstop for whenever
// nobody presses it, not the primary way prices are expected to update.
export const revalidate = 7200;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  // Supplies carry no purity spec, so it stays out of their title.
  const spec = p.format === "supply" ? "Research Use Only" : `${p.purity} Purity`;
  return {
    title: `${p.name} - ${spec} | Research Use Only`,
    description: p.short,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      title: `${p.name} - ${spec}`,
      description: p.short,
      images: [{ url: p.image, width: 1200, height: 1200 }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = getProduct(slug);
  if (!raw) notFound();

  /**
   * Cross-sells, filtered to what can actually be bought.
   *
   * The curated `pairsWith` list is the right starting point - BPC-157 points
   * at TB-500 and KPV, which is the pairing researchers actually run - but five
   * of those hand-picked targets had since gone out of stock, so the PDP was
   * recommending things with no Add To Cart button. Stock is filtered at render
   * rather than edited out of the data, so the list heals itself when the
   * client restocks.
   *
   * Filtered and live-priced together: a candidate that's in the static file
   * but was just marked out of stock in WooCommerce (or vice versa) should be
   * judged on the same live status the shopper is about to see, not the
   * build-time snapshot.
   *
   * The candidate pool is capped BEFORE any live fetch happens, not after.
   * A same-goal backfill pool can easily run to a dozen-plus products, and
   * live-pricing every one of them - 2 WooCommerce requests each, all in
   * flight at once - was enough concurrent load to make WordPress itself the
   * bottleneck, dragging page loads out to the 8s per-request timeout. Only 3
   * slots are ever shown, so at most a small backfill buffer beyond the
   * curated list is ever worth fetching - it is extremely unlikely that more
   * than a few of even a short list are simultaneously out of stock.
   */
  const MAX_BACKFILL = 6;
  const candidateSlugs = (() => {
    const curated = raw.pairsWith ?? [];
    const backfillPool = products
      .filter(
        (o) =>
          o.slug !== raw.slug &&
          !curated.includes(o.slug) &&
          (o.format === "supply"
            ? raw.presentation === "lyophilized"
            : o.goals.some((g) => raw.goals.includes(g)))
      )
      .map((o) => o.slug);
    return [...curated, ...backfillPool.slice(0, MAX_BACKFILL)];
  })();

  // The main product and its cross-sell candidates are unrelated lookups -
  // fetched together, not one after the other, so this page's total wait is
  // however long the SLOWER of the two takes, not their sum.
  const [p, candidates] = await Promise.all([
    withLivePricing(raw),
    withLivePricingForAll(candidateSlugs.map(getProduct).filter((x): x is NonNullable<typeof x> => !!x)),
  ]);

  const pairs = (() => {
    const bySlug = new Map(candidates.map((c) => [c.slug, c]));
    const curated = (p.pairsWith ?? [])
      .map((s) => bySlug.get(s))
      .filter((x): x is NonNullable<typeof x> => !!x && x.inStock);
    if (curated.length >= 3) return curated.slice(0, 3);

    const seen = new Set([p.slug, ...curated.map((c) => c.slug)]);
    const backfill = candidates.filter((c) => c.inStock && !seen.has(c.slug));
    return [...curated, ...backfill].slice(0, 3);
  })();

  const reviews = reviewsFor(p.slug);
  const testSteps = testStepsFor(p.format, p.purity);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: [`${SITE.url}${p.image}`],
    description: p.short,
    sku: p.slug,
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/product/${p.slug}`,
      priceCurrency: "USD",
      price: p.basePrice.toFixed(2),
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    // aggregateRating is emitted only where real reviews exist.
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            ).toFixed(1),
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE.url}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: p.name,
        item: `${SITE.url}/product/${p.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="container-site py-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13.5px] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
            <li aria-hidden>/</li>
            <li className="text-ink">{p.name}</li>
          </ol>
        </nav>

        <div id="pdp-hero" className="grid items-start gap-14 lg:grid-cols-[1fr_480px]">
          <Gallery product={p} />
          <BuyBox product={p} />
        </div>
      </div>

      <div className="container-site grid gap-14 pb-20 lg:grid-cols-[1fr_480px]">
        <div className="max-w-[70ch]">
          {/* What's inside / mechanism */}
          <section className="section-pad !pt-12 !pb-0">
            <h2 className="t-display-md">
              {p.blend?.length ? "What's Inside" : "About This Compound"}
            </h2>
            {p.blend?.length ? (
              <>
                <p className="mt-2 font-mono text-[13px] text-muted">{p.doseLabel}</p>
                <ul className="mt-4 space-y-2">
                  {p.blend.map((b, i) => (
                    <li
                      key={b}
                      className="flex items-center justify-between gap-4 rounded-sm border border-line-soft bg-surface px-4 py-3"
                    >
                      <span className="text-[15px] font-semibold">{b}</span>
                      {p.blendAmounts?.[i] && (
                        <span className="font-mono text-[13px] text-muted">
                          {p.blendAmounts[i]}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {p.description.split("\n\n").map((para, i) => (
              <p key={i} className="mt-4 text-[16px] leading-relaxed text-muted">
                {para}
              </p>
            ))}
          </section>

          {/* Research areas */}
          {p.researchAreas.length > 0 && (
            <section className="section-pad !pb-0">
              <h2 className="t-display-md">Research Areas</h2>
              <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {p.researchAreas.map((a) => (
                  <li key={a.title}>
                    <h3 className="t-title">{a.title}</h3>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{a.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Literature */}
          {p.refs?.length ? (
            <section className="section-pad !pb-0">
              <h2 className="t-display-md">Literature</h2>
              <ul className="mt-4 space-y-2">
                {p.refs.map((r) => (
                  <li key={r}>
                    <a
                      href={r}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[14px] text-teal-dark hover:underline"
                    >
                      {r}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Quality & testing. Supplies (bacteriostatic water) are not tested
              by us, so the whole section is omitted rather than shown empty. */}
          {testSteps.length > 0 && (
            <section className="section-pad !pb-0">
              <h2 className="t-display-md">Quality &amp; Testing</h2>
              <ol className="mt-5 grid gap-4 sm:grid-cols-2">
                {testSteps.map((s) => (
                  <li key={s.n} className="card p-4">
                    <p className="label text-faint">{s.n}</p>
                    <h3 className="t-title mt-1">{s.title}</h3>
                    <p className="mt-0.5 text-[13.5px] text-muted">{s.method}</p>
                  </li>
                ))}
              </ol>
              {p.coaUrl && (
                <CoaViewer
                  slug={p.slug}
                  name={p.name}
                  batch={p.coaBatch}
                  className="mt-4 inline-block text-[15px] font-semibold text-teal-dark hover:underline"
                >
                  Open This Batch&apos;s COA &rarr;
                </CoaViewer>
              )}
            </section>
          )}

          <section className="section-pad !pb-0">
            <h2 className="t-display-md mb-4">Shipping &amp; Returns</h2>
            <ShippingAccordion />
          </section>

          {/* Reviews: only where a real corpus exists. */}
          {reviews.length > 0 && (
            <section className="section-pad !pb-0">
              <h2 className="t-display-md">Reviews</h2>
              <ul className="mt-5 space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="card p-5">
                    <p className="text-star">{"★".repeat(r.rating)}</p>
                    <h3 className="t-title mt-1">{r.headline}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{r.body}</p>
                    <p className="mt-2 text-[13px] text-faint">
                      {r.firstName} {r.lastInitial}. · verified purchase
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Pairs well with: hand-picked, and every button adds to cart. */}
      {pairs.length > 0 && (
        <section className="section-pad bg-surface">
          <div className="container-site">
            <h2 className="t-display-md mb-6">Pairs Well With</h2>
            <RelatedProducts products={pairs} sizes="(max-width: 640px) 90vw, 360px" />
          </div>
        </section>
      )}

      <section className="bg-surface-2">
        <div className="container-site py-8">
          <p className="max-w-[92ch] text-[12.5px] leading-relaxed text-muted">
            <strong className="font-semibold text-ink">Research use only.</strong>{" "}
            {p.name} is sold strictly for laboratory research. It is not a drug,
            food, cosmetic, or medical device, and is not for human or veterinary
            consumption. These statements have not been evaluated by the Food and
            Drug Administration. This product is not intended to diagnose, treat,
            cure, or prevent any disease. Purchasers confirm they are qualified
            researchers aged 21 or older and accept responsibility for safe
            handling and lawful use.
          </p>
        </div>
      </section>

      <StickyMobileBar product={p} />
    </>
  );
}
