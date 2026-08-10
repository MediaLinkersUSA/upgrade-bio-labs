# Hosting this site yourself

A start-to-finish guide for putting the Upgrade Bio Labs storefront on your own
Vercel account. No coding required — it's copying values into boxes.

Set aside about 45 minutes. Nothing here touches the current live site, so you
can stop partway and come back.

---

## Before you start

Have these five things open or to hand:

1. A **GitHub account** (free — github.com/signup)
2. Your **Supabase** login — this is the database holding orders
3. Access to **WordPress admin** at upgradebiolabs.com
4. The **customer blocklist file** the team sent you (a long line of text)
5. A **password you choose** for your own dashboard — 8 characters minimum

---

## Step 1 — Copy the code to your GitHub

The code lives in someone else's GitHub account. You need your own copy.

1. Sign in to GitHub.
2. Go to **https://github.com/devitzikman-ship-it/upgrade-bio-labs**
3. Click **Fork** (top right).
4. Leave everything as-is and click **Create fork**.

You now have your own copy at `github.com/YOUR-USERNAME/upgrade-bio-labs`.
Everything from here uses *your* copy.

---

## Step 2 — Create your Vercel account

Vercel is the hosting. The free plan is enough to start.

1. Go to **https://vercel.com/signup**
2. Choose **Continue with GitHub** — this is important, it's what lets Vercel
   see your code.
3. Approve the permissions GitHub asks for.

---

## Step 3 — Import the site

1. On your Vercel dashboard, click **Add New… → Project**.
2. Find **upgrade-bio-labs** in the list and click **Import**.
3. Vercel will detect Next.js on its own. **Don't change any build settings.**
4. **Do not click Deploy yet.** Expand **Environment Variables** first — the
   next step. Deploying without them produces a site with no database.

---

## Step 4 — Environment variables

These are the settings that connect the site to your database, your
WooCommerce, and your dashboard login. Add each one as a **Name** and a
**Value** pair.

### The six you must set

| Name | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → your project → **Project Settings → API** → "Project URL". Looks like `https://abcdefgh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → **Secret key**, click **Reveal**. Starts `sb_secret_`. Treat this like a bank password |
| `ADMIN_PASSWORD` | You choose it. This is how you log in to your dashboard. 8 characters minimum |
| `WOO_CONSUMER_KEY` | See "Getting the WooCommerce keys" below. Starts `ck_` |
| `WOO_CONSUMER_SECRET` | Same. Starts `cs_` |
| `LEGACY_CUSTOMER_HASHES` | The long line of text the team sent you. Paste the whole thing, exactly as given |

### One more, which changes later

| Name | Value for now |
| --- | --- |
| `WOO_STORE_URL` | `https://upgradebiolabs.com` |

⚠️ **This one changes on the day you move the domain.** See Step 8. If it isn't
changed, orders stop reaching WooCommerce and nothing will warn you.

### What each one actually does

- **The two Supabase values** connect the site to the database that stores
  orders, so losing them means orders have nowhere to go.
- **`ADMIN_PASSWORD`** protects `/admin`. Leave it unset and the dashboard
  simply refuses to open — safe, but you can't see your orders.
- **The two WooCommerce keys** are what let the site copy each order into
  WooCommerce, so ShipStation and your labels keep working.
- **`LEGACY_CUSTOMER_HASHES`** is your existing customer list, stored in a
  scrambled one-way form. It stops your 964 existing customers from claiming
  the 25%-off first-order code. Leave it out and everyone gets 25% off.

### Getting the WooCommerce keys

1. Go to
   `https://upgradebiolabs.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
2. Click **Add key**.
3. Description: `Storefront order sync`. User: yourself.
   Permissions: **Read/Write** — it must be Read/Write, not Read.
4. Click **Generate API key**.
5. Copy both values immediately. **The secret is shown only once.** If you miss
   it, delete the key and make a new one — no harm done.

---

## Step 5 — Deploy

Click **Deploy** and wait two or three minutes.

When it finishes you'll get a web address ending in `.vercel.app`. Open it —
the storefront should load.

> Search engines are automatically blocked while the site is on a `.vercel.app`
> address, so this preview can't compete with your real site in Google. That
> lifts by itself once your own domain is connected.

---

## Step 6 — Set up the database

One piece of setup has to run inside Supabase.

1. In your Vercel project, open the file
   `supabase/migrations/0004_external_payment.sql` on GitHub and copy
   everything in it.
2. In Supabase, open **SQL Editor** → **New query**.
3. Paste it in and click **Run**.
4. "Success. No rows returned" is what you want.

This is safe to run more than once, so if you're unsure whether it worked, run
it again.

---

## Step 7 — Check it works

1. Go to `your-site.vercel.app/admin` and log in with your `ADMIN_PASSWORD`.
2. In another tab, add something to the cart and place a **Zelle** order using
   your own details.
3. That order should now appear in three places:
   - your `/admin` dashboard
   - Supabase → **Table Editor** → `orders`
   - **WooCommerce → Orders**, marked *On hold*

If it shows in the first two but not WooCommerce, the two WooCommerce keys are
wrong or weren't set to Read/Write.

Delete the test order from WooCommerce afterwards so it doesn't reach
ShipStation.

---

## Step 8 — Point your domain at it

Do this last, once you're happy everything works.

**In Vercel:** Project → **Settings → Domains** → add `upgradebiolabs.com` and
`www.upgradebiolabs.com`. Vercel will show you the DNS record it wants.

**At GoDaddy** (where your domain lives) → **DNS → Records**:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| A | `www` | `76.76.21.21` |

Three things that matter here:

- **Don't change the nameservers.** Your email runs through those settings, and
  replacing them takes your email down.
- **Lower the TTL to 600 first**, save, then change the addresses. This makes
  undoing it take minutes instead of hours.
- **Add `old.upgradebiolabs.com` pointing at `23.111.157.154` first.** That
  keeps WordPress — and every past order — reachable after the switch. Without
  it you lose your own admin.

**To undo at any point:** set the `@` record back to `23.111.157.154` — that is
your current WordPress server, and putting it back returns the old site.

### Immediately afterwards — one required change

In Vercel → **Settings → Environment Variables**, change:

```
WOO_STORE_URL = https://old.upgradebiolabs.com
```

Then **Deployments → ⋯ → Redeploy**.

Until you do this, the site is trying to send orders to `upgradebiolabs.com`,
which is now the new site rather than WooCommerce — so orders quietly stop
arriving and nothing tells you. Do it in the same sitting as the DNS change.

---

## Things worth knowing

**Editing text on the site.** Content lives in the code, so wording changes are
a developer job — there's no page editor like WordPress. The `/admin` dashboard
handles the day-to-day: viewing orders, changing order status, adding tracking
numbers, uploading new COAs.

**Payments.** The storefront never touches card details. Card customers are
handed to your existing payment page, which is unchanged.

**Orders won't mark themselves paid.** Someone reaching the thank-you page
isn't proof they paid — that address can simply be typed. So new orders arrive
as *Pending* or *Awaiting transfer*, and you move them to *Paid* in the
dashboard once you've confirmed the money. That change carries through to
WooCommerce automatically.

**Only one copy should be live.** While the team's version is still running,
both would copy every order into WooCommerce and you'd see each order twice.
Tell them once yours is working and they'll shut theirs down.

---

## If something breaks

| What you see | Usually means |
| --- | --- |
| Build fails immediately | A variable name is misspelled — they're case-sensitive |
| Site loads, dashboard won't accept your password | `ADMIN_PASSWORD` missing or under 8 characters |
| "Orders are not available right now" at checkout | The two Supabase values are missing or wrong |
| Orders appear in the dashboard but not WooCommerce | WooCommerce keys wrong, or not Read/Write |
| Everyone is getting 25% off | `LEGACY_CUSTOMER_HASHES` wasn't pasted in |
| Orders stopped reaching WooCommerce after the domain move | `WOO_STORE_URL` still points at `upgradebiolabs.com` |

After changing any variable you must **redeploy** for it to take effect:
**Deployments → ⋯ → Redeploy**.
