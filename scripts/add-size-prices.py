#!/usr/bin/env python3
"""Price the large fills the client confirmed on 2 Aug 2026.

She sent one price per size (the single-unit price). The 3-unit and 5-unit
rungs mirror the same SKU's smaller fill exactly, so a 20mg buyer gets the same
percentage break a 10mg buyer does. Those two rungs are an inference, not a
client-supplied number, and are flagged for confirmation.
"""

import json
import pathlib
import re
import sys

PRODUCTS = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "products.ts"

# slug -> (size label, single-unit price from the client)
CONFIRMED = {
    "tz-2": ("20mg", 210.0),
    "rt-3": ("20mg", 215.0),
    "wolverine-blendbpc-157-tb-500": ("10mg / 10mg", 140.0),
}


def main() -> int:
    src = PRODUCTS.read_text()
    m = re.search(r"(export const products[^=]*=\s*)(\[.*\])(\s*;)", src, re.S)
    if not m:
        print("could not locate the products array", file=sys.stderr)
        return 1

    data = json.loads(m.group(2))
    by_slug = {p["slug"]: p for p in data}

    for slug, (label, base) in CONFIRMED.items():
        p = by_slug[slug]
        ladder = p["tiers"]  # the priced small fill

        target = next((s for s in p["sizes"] if s["label"] == label), None)
        if target is None:
            print(f"no size {label!r} on {slug}", file=sys.stderr)
            return 1

        tiers = []
        for i, t in enumerate(ladder):
            if i == 0:
                unit = base
            else:
                # Same percentage break as the smaller fill, to the dollar.
                unit = round(base * (t["unitPrice"] / ladder[0]["unitPrice"]))
            row = {"minQty": t["minQty"], "unitPrice": unit}
            if t.get("label"):
                row["label"] = t["label"]
            tiers.append(row)

        target["tiers"] = tiers
        print(f"{p['name']:18} {label:12} {[t['unitPrice'] for t in tiers]}")

    PRODUCTS.write_text(
        src[: m.start(2)] + json.dumps(data, indent=2, ensure_ascii=False) + src[m.end(2) :]
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
