# Setting up your database — about 10 minutes

This is where your store keeps orders, customer emails, and the COA PDFs you
upload. You create the account so **you own it**. Nothing here is permanent or
breakable — if a step goes wrong, just tell Devin and he'll sort it.

---

## 1. Create the account

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up with your work email (or "Continue with Google").
3. When it asks about an organization, name it **Upgrade Bio Labs** and choose
   the **Free** plan. Free is genuinely fine to launch on — it holds tens of
   thousands of orders. You can upgrade later without moving anything.

## 2. Create the project

1. Click **New project**.
2. **Name:** `upgrade-bio-labs`
3. **Database Password:** click **Generate a password**, then **save it in your
   password manager**. You won't need it day to day, but it can't be recovered
   later.
4. **Region:** pick the one closest to most of your customers (for the US,
   `East US (North Virginia)`).
5. Click **Create new project** and give it about two minutes to finish.

## 3. Set up the tables

1. In the left sidebar click **SQL Editor**.
2. Click **New query**.
3. Open the file Devin sent you called **`SETUP.sql`**, select all of it, and
   paste it into the box.
4. Click **Run** (bottom right).

You should see **Success. No rows returned** — that's correct, it means the
tables were created. If you see red text, screenshot it and send it over.

> **Note:** the **Shared** and **Private** sections in the SQL Editor sidebar
> are for queries *you* save. They stay empty until you save one, and that is
> not where `SETUP.sql` appears. You're pasting the file into a **New query**
> tab, not looking for it in a list.

### Check it worked

Open another **New query**, paste this, and click **Run**:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

You should get back **exactly six rows**:

```
coa_documents
order_items
orders
reviews
stock_requests
subscribers
```

Six rows means you're done with this step. Fewer than six (or zero) means the
setup script didn't run — go back to step 3. Send Devin a screenshot either
way and he'll confirm.

## 4. Copy the two keys

1. In the sidebar click **Project Settings** (the gear), then **API Keys**.
2. You need two values:

   - **Project URL** — looks like `https://abcdefgh.supabase.co`
     (under **Project Settings → Data API**)
   - **Secret key** — starts `sb_secret_...`. Click **Reveal** to see it.

> 💡 **If you're looking for something called "service_role" and can't find
> it — that's fine, Supabase renamed the keys.** You may see either naming
> depending on how new your project is:
>
> | Old name | New name | Is it the one we need? |
> |---|---|---|
> | `anon` | **Publishable key** (`sb_publishable_...`) | No |
> | `service_role` | **Secret key** (`sb_secret_...`) | **Yes — this one** |
>
> If you only see a publishable key on screen, the secret key is on the same
> page under its own **Secret keys** heading, usually just below. It's hidden
> until you click **Reveal**.

> ⚠️ **The secret key is like the master key to your database.** Anyone
> who has it can read every customer email and order.
>
> **Please don't paste it into WhatsApp, text, or regular email.**
> Instead go to **https://onetimesecret.com**, paste the key there, click
> *Create a secret link*, and send Devin the link. It self-destructs after he
> opens it once.
>
> If it ever does get sent somewhere insecure, that's recoverable — you can
> click **Reset** on that key in Supabase and generate a fresh one.

## 5. Choose your dashboard password

This is the password **you'll use to log in** to your own dashboard at
`/admin` to see orders, download your email list, and upload new COAs.

- Make it at least 12 characters.
- Don't reuse a password from anywhere else.
- Send it to Devin through the same one-time link as above (you can put both
  the key and the password in one secret).

---

## What to send Devin

Via a **onetimesecret.com** link:

```
Project URL:        https://xxxxxxxx.supabase.co
Secret key:         sb_secret_...
Dashboard password: (the one you chose)
```

He'll add them to the site, and your dashboard goes live at
**yoursite.com/admin**.

---

## What you'll be able to do once it's on

- **Orders** — see every order with customer, items and total. Download as a
  spreadsheet any time.
- **Emails** — your full subscriber list, plus everyone waiting on a
  back-in-stock item and which product they want. Both exportable.
- **COAs** — pick a product, upload a new PDF, and it's live on that product
  page straight away. No developer, no waiting. Old versions are kept, so
  re-uploading never loses anything.

## Good to know

- Your customers' card details are **never** stored here. Stripe handles all
  payment data and it never touches your database.
- You can add staff logins later if you want more than one person in there.
- Free plan pauses a project after a week of total inactivity; once real
  orders are flowing that never happens.
