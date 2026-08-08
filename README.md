# Upgrade Bio Labs

Storefront for a US research-peptide supplier. 60 SKUs across lyophilised
vials, nasal sprays, capsules, and reconstitution supplies.

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Supabase.

## Run

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

## If you are coming from the WordPress build

This replaced a WooCommerce store, and the mental model is different in ways
that will bite before anything else does.

There is **no cPanel, no FTP and no SSH**. Vercel is serverless - there is no
server to log into. Nothing is uploaded; code is deployed by pushing to this
repository, and Vercel builds it.

| WordPress | Here |
| --- | --- |
| cPanel | Vercel dashboard |
| FTP upload | `git push` |
| phpMyAdmin / MySQL | Supabase - Postgres, SQL editor and connection string |
| PHP hooks, `functions.php`, plugins | TypeScript in `src/` |
| WP admin | `/admin`, built in this repo |

Database access is full and real, it is simply Postgres rather than MySQL.
Schema changes are SQL files in `supabase/migrations/`, applied in the Supabase
SQL editor - not migrations run by a framework.

## Payments

This storefront does **not** process payments and holds no payment
credentials. There is no Stripe key here and nothing to configure.

1. `POST /api/orders` records the order in Supabase. Every price is recomputed
   server-side from `src/data/products.ts` - the browser sends slugs and
   quantities, never money.
2. Card orders redirect to the WordPress payment property
   (`upgradebiolabservices.com`, UBL Stripe Connect Pro) carrying `order_id`,
   `amount`, `return_url` and `cancel_url`.
3. That plugin's `payment.js` also fetches
   `{mainSite}/wp-json/ubl-stripe/v1/order-details?order_id=…` on load, where
   `mainSite` is `upgradebiolabs.com`. **This app serves that path** - see
   `src/app/wp-json/…`. It is a WordPress-shaped URL answered by Next.js on
   purpose, so the plugin needs no change. Given `{customer, total}` it fills
   its amount field and auto-submits.
4. Zelle and CashApp orders are recorded the same way and settled by hand.
   `/order/pending` shows the customer where to send the money.

Nothing marks an order paid automatically. A customer reaching `/thank-you` is
not proof of payment - the URL can simply be typed - so status is moved by hand
in `/admin` until something server-to-server confirms it.

## Deploying

```bash
npm run build     # must pass before pushing
vercel --prod     # or let the GitHub integration deploy on push to main
```

Never run `npm run build` while `next dev` is running; they share `.next` and
the dev server starts serving a half-written build.

## Data

`src/data/products.ts` is generated, not hand-edited. It is the single source
of truth for every collection page, PDP, filter count, and schema block.

```bash
npx tsx scripts/gen-products.ts     # rebuild from scripts/catalogue-final.json
```

Prices and quantity ladders are the real per-variation values scraped from the
live catalogue, not computed percentages: several SKUs have no ladder at all,
and the card only shows a saving chip where one genuinely exists.

`copySource: "authored"` marks descriptions written for this build because the
live PDP had none. Those need client review before publishing.

## Product images

```bash
npx tsx scripts/harvest.ts           # pull source photos into /source-images
npx tsx scripts/normalize-images.ts  # -> public/products/*.webp
```

The upstream renders are already consistent in lighting and shadow but vary in
apparent scale and sit on an off-palette grey. `normalize-images.ts` fixes only
that, deterministically: no generative model touches the images, so a printed
label cannot drift from its source. See the header comment in that file for how
the backdrop is separated from the product.

Keep `/source-images` committed. When a label changes, re-run one SKU:

```bash
npx tsx scripts/normalize-images.ts bpc-157
```

## Reviews

`src/data/reviews.ts` is intentionally empty. The reviews section, the hero
rating line, and `aggregateRating` schema are all gated on it and stay hidden
until there are 25+ real reviews. Fabricated reviews in this category are a
regulatory problem, and marking up a rating that does not exist risks a manual
action.
