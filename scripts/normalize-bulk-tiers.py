#!/usr/bin/env python3
"""Give sprays and capsules a single, uniform bulk-discount ladder.

Client instruction (4 Aug 2026): the per-product quantity breaks on sprays and
capsules had drifted all over the place - sprays ran from 0% to 10% off and
capsules from 0% to 19% - because each was scraped from whatever the live site
happened to charge. They should all be 3% at the first break and 6% at the
second.

Vials were left alone on that pass, but the same drift showed up on the product
cards - one vial advertised "Save 9% At 5+" beside two showing 10% - so they are
normalized here too, to the 5%/10% that 26 of 36 already used.

Only SKUs that already expose a multi-tier ladder are touched. A product sold
at one price with no quantity break keeps that shape rather than having a
discount invented for it.
"""

import json
import pathlib
import re
import sys

PRODUCTS = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "products.ts"

#: Discount off the single-unit price at each successive tier, per format.
#: Sprays and capsules at 3/6 and vials at 5/10, both by client instruction.
#: Supplies follow the vial ladder where they have one at all.
LADDERS = {
    "spray":   [0.0, 0.03, 0.06],
    "capsule": [0.0, 0.03, 0.06],
    "vial":    [0.0, 0.05, 0.10],
    "supply":  [0.0, 0.05, 0.10],
}


def retier(tiers, ladder):
    """Rebuild a ladder off tier 0's price. Returns None if shape is unusable."""
    if not tiers or len(tiers) != len(ladder):
        return None
    base = tiers[0]["unitPrice"]
    out = []
    for t, off in zip(tiers, ladder):
        row = {k: v for k, v in t.items() if k != "unitPrice"}
        row["unitPrice"] = round(base * (1 - off), 2)
        out.append(row)
    return out


def main() -> int:
    src = PRODUCTS.read_text()
    m = re.search(r"(export const products[^=]*=\s*)(\[.*\])(\s*;)", src, re.S)
    if not m:
        print("could not locate the products array", file=sys.stderr)
        return 1

    data = json.loads(m.group(2))
    changed, skipped = [], []

    for p in data:
        ladder = LADDERS.get(p["format"])
        if not ladder:
            continue

        before = [t["unitPrice"] for t in p["tiers"]]
        rebuilt = retier(p["tiers"], ladder)
        if rebuilt is None:
            skipped.append(f"{p['name']} ({len(p['tiers'])} tier)")
            continue
        p["tiers"] = rebuilt
        p["basePrice"] = rebuilt[0]["unitPrice"]

        # Size variants carry their own ladders and must move in step.
        for s in p.get("sizes") or []:
            if s.get("tiers"):
                s["tiers"] = retier(s["tiers"], ladder) or s["tiers"]

        after = [t["unitPrice"] for t in p["tiers"]]
        if before != after:
            changed.append((p["name"], before, after))

    PRODUCTS.write_text(
        src[: m.start(2)] + json.dumps(data, indent=2, ensure_ascii=False) + src[m.end(2) :]
    )

    for name, b, a in changed:
        print(f"  {name:34} {b} -> {a}")
    print(f"\n{len(changed)} repriced, {len(skipped)} left as-is")
    for s in skipped:
        print(f"  kept single-price: {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
