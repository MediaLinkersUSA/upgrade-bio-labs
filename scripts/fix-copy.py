#!/usr/bin/env python3
"""Client corrections to product copy (Lisa L, 1 Aug 2026).

- RT-3 is a TRIPLE agonist. It was described as dual.
- TZ-2 is a DUAL agonist. It was described as a single GLP-1 agonist.
- "GLP" is spelled out as "glucagon-like peptide-1" everywhere it is customer
  facing, per the client's compliance preference.
- KLOW Capsules carry a confirmed per-capsule breakdown.

Operates on the JSON array inside src/data/products.ts so the surrounding
formatting is regenerated cleanly.
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "src" / "data" / "products.ts"

GLP1 = "glucagon-like peptide-1"
GIP = "glucose-dependent insulinotropic polypeptide"

PATCH = {
    "rt-3": {
        "short": "Research-grade triple receptor agonist for metabolic study designs.",
        "description": (
            "RT-3 is supplied as a research-grade triple receptor agonist, acting at the "
            f"{GLP1}, {GIP}, and glucagon receptors. Triple-agonist research examines "
            "whether adding glucagon-receptor activity to combined incretin signaling "
            "produces effects on energy expenditure and body composition beyond what dual "
            "agonism achieves."
        ),
        "researchAreas": [
            {
                "title": "Triple Receptor Signaling",
                "body": f"Studied for simultaneous activity at the {GLP1}, {GIP}, and glucagon receptors.",
            },
            {
                "title": "Energy Expenditure",
                "body": "Investigated for the glucagon-receptor contribution to resting metabolic rate.",
            },
            {
                "title": "Body Composition",
                "body": "Examined for fat-mass and lean-mass distribution in metabolic models.",
            },
            {
                "title": "Gastric Emptying",
                "body": "Explored for transit delay and its contribution to satiety signaling.",
            },
        ],
    },
    "tz-2": {
        "short": "Research-grade dual incretin receptor agonist.",
        "description": (
            "TZ-2 is supplied as a research-grade dual incretin receptor agonist, acting at "
            f"both the {GIP} and {GLP1} receptors. Dual-agonist research examines whether "
            "combined incretin signaling produces effects on glucose handling and body "
            "composition beyond what single-receptor agonism achieves."
        ),
        "researchAreas": [
            {
                "title": "Dual Incretin Signaling",
                "body": f"Studied for simultaneous activation of the {GIP} and {GLP1} receptors.",
            },
            {
                "title": "Glycemic Control",
                "body": "Investigated for glucose-dependent insulin secretion and glucagon suppression.",
            },
            {
                "title": "Gastric Emptying",
                "body": "Examined for transit delay and its contribution to satiety.",
            },
            {
                "title": "Body Composition",
                "body": "Explored for adipose and lean-mass distribution in animal models.",
            },
        ],
    },
    "klow-capsulesbpc-157-tb-500-kpv-ghk-cu": {
        # Client-confirmed per-capsule split. Order matches `blend` below.
        "blend": ["BPC-157", "TB-500", "GHK-Cu", "KPV"],
        "blendAmounts": ["500 mcg", "500 mcg", "2 mg", "500 mcg"],
        "doseLabel": "500 MCG / 500 MCG / 2 MG / 500 MCG Per Capsule",
        # 3.5 mg per capsule x 60 capsules.
        "doseMg": 210,
        "short": "The four-peptide KLOW stack in an oral 60-count bottle.",
        "description": (
            "The KLOW four-peptide combination in oral capsule form: 500mcg BPC-157, 500mcg "
            "TB-500, 2mg GHK-Cu and 500mcg KPV per capsule, 60 capsules per bottle. Oral "
            "research formats are studied primarily for gastrointestinal-tract effects, where "
            "local mucosal exposure rather than systemic bioavailability is the endpoint."
        ),
    },
}


def main() -> int:
    src = PRODUCTS.read_text()
    m = re.search(r"(export const products[^=]*=\s*)(\[.*\])(\s*;)", src, re.S)
    if not m:
        print("could not locate the products array", file=sys.stderr)
        return 1

    data = json.loads(m.group(2))
    by_slug = {p["slug"]: p for p in data}

    missing = [s for s in PATCH if s not in by_slug]
    if missing:
        print(f"unknown slugs: {missing}", file=sys.stderr)
        return 1

    for slug, fields in PATCH.items():
        by_slug[slug].update(fields)
        print(f"patched {slug}")

    out = src[: m.start(2)] + json.dumps(data, indent=2, ensure_ascii=False) + src[m.end(2) :]
    PRODUCTS.write_text(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
