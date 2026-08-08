#!/usr/bin/env python3
"""
One-off sweep: the build used an all-lowercase editorial voice for headings,
nav, buttons and labels. The client wants conventional capitalisation.

Title Case for headings, nav, buttons and named things.
Sentence case for full sentences and questions, which read wrong in Title Case.
"""
import re, pathlib

# exact visible-string replacements, longest first so substrings do not clash
PAIRS = [
    # --- section headings -------------------------------------------------
    ("three formats, one catalogue", "Three Formats, One Catalogue"),
    ("build your stack. save up to 20%.", "Build Your Stack. Save Up To 20%."),
    ("what researchers reorder", "What Researchers Reorder"),
    ("start with the outcome", "Start With The Outcome"),
    ("before you order", "Before You Order"),
    ("pairs well with", "Pairs Well With"),
    ("the receipts", "The Receipts"),
    ("first to know.", "First To Know."),
    ("research areas", "Research Areas"),
    ("quality &amp; testing", "Quality &amp; Testing"),
    ("shipping &amp; returns", "Shipping &amp; Returns"),
    ("what&apos;s inside", "What&apos;s Inside"),
    ("about this compound", "About This Compound"),
    ("literature", "Literature"),
    ("reviews", "Reviews"),
    ("the COA library", "The COA Library"),
    ("how to read a COA", "How To Read A COA"),
    ("all peptides", "All Peptides"),
    ("partner with us", "Partner With Us"),
    ("join our research community", "Join Our Research Community"),
    ("wholesale and bulk", "Wholesale And Bulk"),
    ("about us", "About Us"),
    ("accounts are moving", "Accounts Are Moving"),
    ("order confirmed", "Order Confirmed"),
    ("upload a new COA", "Upload A New COA"),
    ("documents by product", "Documents By Product"),
    ("certificate of analysis", "Certificate Of Analysis"),
    ("research use only", "Research Use Only"),
    ("by research goal", "By Research Goal"),
    ("or start from a preset", "Or Start From A Preset"),
    ("every batch, tested", "Every Batch, Tested"),
    ("upgrade bio labs", "Upgrade Bio Labs"),
    ("stack discount", "Stack Discount"),
    ("your order", "Your Order"),

    # --- logistics / proof ------------------------------------------------
    ("ships today", "Ships Today"),
    ("free shipping over", "Free Shipping Over"),
    ("shipment protection", "Shipment Protection"),
    ("sourced and filled in the USA", "Sourced And Filled In The USA"),
    ("cold-chain shipped, protective packaging", "Cold-Chain Shipped, Protective Packaging"),
    ("batch-traceable from synthesis to doorstep", "Batch-Traceable From Synthesis To Doorstep"),
    ("identity", "Identity"),
    ("purity", "Purity"),
    ("quantity", "Quantity"),
    ("endotoxin", "Endotoxin"),
    ("heavy metals", "Heavy Metals"),

    # --- formats / goals --------------------------------------------------
    ("lyophilized vials", "Lyophilized Vials"),
    ("nasal sprays", "Sprays"),
    ("sprays", "Sprays"),
    ("capsules", "Capsules"),
    ("vials", "Vials"),
    ("supplies", "Supplies"),
    ("recovery &amp; repair", "Recovery &amp; Repair"),
    ("weight &amp; metabolic", "Weight &amp; Metabolic"),
    ("focus &amp; mood", "Focus &amp; Mood"),
    ("longevity &amp; energy", "Longevity &amp; Energy"),
    ("skin &amp; hair", "Skin &amp; Hair"),
    ("immune &amp; gut", "Immune &amp; Gut"),

    # --- nav / footer -----------------------------------------------------
    ("shop", "Shop"), ("formats", "Formats"), ("quality", "Quality"),
    ("partner", "Partner"), ("contact", "Contact"), ("home", "Home"),
    ("coas", "COAs"), ("faq", "FAQ"), ("returns", "Returns"),
    ("shipping", "Shipping"), ("testing", "Testing"),
    ("coa library", "COA Library"), ("bestsellers", "Bestsellers"),
    ("by goal", "By Goal"), ("build a stack", "Build A Stack"),

    # --- buttons / CTAs ---------------------------------------------------
    ("shop all peptides", "Shop All Peptides"),
    ("browse COA library", "Browse COA Library"),
    ("browse the full COA library", "Browse The Full COA Library"),
    ("browse the COA library", "Browse The COA Library"),
    ("browse all peptides", "Browse All Peptides"),
    ("browse the catalogue", "Browse The Catalogue"),
    ("keep browsing", "Keep Browsing"),
    ("add compound", "Add Compound"),
    ("add stack to cart", "Add Stack To Cart"),
    ("add to order", "Add To Order"),
    ("add to cart", "Add To Cart"),
    ("notify me", "Notify Me"),
    ("reveal my code", "Reveal My Code"),
    ("send my code", "Send My Code"),
    ("apply to join", "Apply To Join"),
    ("start a conversation", "Start A Conversation"),
    ("contact support", "Contact Support"),
    ("how we test", "How We Test"),
    ("sign in", "Sign In"),
    ("sign out", "Sign Out"),
    ("upload COA", "Upload COA"),
    ("export CSV", "Export CSV"),
    ("open PDF", "Open PDF"),
    ("view COA", "View COA"),
    ("open in new tab", "Open In New Tab"),
    ("download", "Download"),
    ("checkout", "Checkout"),
    ("view", "View"),

    # --- small labels -----------------------------------------------------
    ("recovery stack", "Recovery Stack"),
    ("longevity stack", "Longevity Stack"),
    ("metabolic stack", "Metabolic Stack"),
    ("beauty stack", "Beauty Stack"),
    ("most popular", "Most Popular"),
    ("best value", "Best Value"),
    ("bestseller", "Bestseller"),
    ("free", "Free"),
    ("subtotal", "Subtotal"),
    ("discount", "Discount"),
    ("shipping", "Shipping"),
    ("total", "Total"),
    ("you pay", "You Pay"),
    ("you save", "You Save"),
    ("each", "Each"),
    ("size", "Size"),
    ("format", "Format"),
    ("research goal", "Research Goal"),
    ("max price", "Max Price"),
    ("in stock only", "In Stock Only"),
    ("clear all filters", "Clear All Filters"),
    ("all formats", "All Formats"),
    ("all goals", "All Goals"),
    ("all", "All"),
    ("sort", "Sort"),
    ("email", "Email"),
    ("phone", "Phone"),
    ("date", "Date"),
    ("customer", "Customer"),
    ("items", "Items"),
    ("status", "Status"),
    ("product", "Product"),
    ("commission", "Commission"),
    ("component", "Component"),
    ("verified", "Verified"),
    ("updated", "Updated"),
    ("handling", "Handling"),
    ("unlocks at", "Unlocks At"),
    ("their discount", "Their Discount"),
    ("current document", "Current Document"),
    ("none published", "None Published"),
    ("what you also need", "What You Also Need"),
    ("us quarter", "US Quarter"),
    ("email address", "Email Address"),
    ("password", "Password"),
    ("batch number", "Batch Number"),
    ("orders", "Orders"),
    ("emails", "Emails"),
    ("revenue", "Revenue"),
    ("email subscribers", "Email Subscribers"),
    ("subscribers", "Subscribers"),
    ("dashboard", "Dashboard"),
]

PAIRS.sort(key=lambda p: -len(p[0]))

# Replace only inside JSX text nodes ( >text< ) and simple quoted UI strings.
TEXT_NODE = re.compile(r'>(\s*)([^<>{}\n]{2,80}?)(\s*)<')

def fix_text(m):
    lead, body, trail = m.group(1), m.group(2), m.group(3)
    for a, b in PAIRS:
        if body == a:
            return f">{lead}{b}{trail}<"
    return m.group(0)

QUOTED = re.compile(r'(["\'])([a-z][^"\'\n]{2,60})\1')

def fix_quoted(m):
    q, body = m.group(1), m.group(2)
    for a, b in PAIRS:
        if body == a:
            return f"{q}{b}{q}"
    return m.group(0)

root = pathlib.Path("src")
changed = 0
for f in list(root.rglob("*.tsx")) + [pathlib.Path("src/data/faq.ts"), pathlib.Path("src/lib/config.ts")]:
    if not f.exists():
        continue
    src = f.read_text()
    out = TEXT_NODE.sub(fix_text, src)
    if f.suffix == ".ts" or "config" in f.name or "faq" in f.name:
        out = QUOTED.sub(fix_quoted, out)
    if out != src:
        f.write_text(out)
        changed += 1
print(f"updated {changed} files")
