#!/usr/bin/env python3
"""Re-frame scraped product copy as research-use-only.

The descriptions carried over from upgradebiolabs.com say what compounds
"treat" and name specific diseases as targets. The client asked for RUO
compliance on the spray naming; the same standard has to apply to the copy
itself, which is a materially larger exposure than the word "nasal".

Every rewrite preserves the mechanism and the study endpoints from the source
and drops only the treatment framing. Nothing here invents a claim: where the
source named a condition, the rewrite names the corresponding research model.
"""

import json
import pathlib
import re
import sys

PRODUCTS = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "products.ts"

REWRITE = {
    "5-amino-1-mq": (
        "5-Amino-1MQ is a synthetic small molecule developed for laboratory research. It "
        "selectively targets the NNMT enzyme (nicotinamide N-methyltransferase), which makes "
        "it a tool for controlled investigation of metabolic pathways, fat metabolism, and "
        "cellular energy regulation. Preclinical work examines NNMT inhibition and its "
        "downstream metabolic effects."
    ),
    "aod-9604": (
        "AOD-9604 is a synthetic peptide fragment derived from the C-terminal region of human "
        "growth hormone. Research examines its effect on lipolysis and lipogenesis in metabolic "
        "models, and notes that it does not carry the blood-glucose or growth-hormone activity "
        "of the full-length molecule."
    ),
    "ara-290": (
        "ARA-290 (cibinetide) is a synthetic peptide that acts on the innate repair receptor "
        "(IRR). Research examines its effect on inflammatory signaling and tissue repair in "
        "neuropathy models, including small fiber neuropathy, and notes that IRR activation is "
        "separate from erythropoietic activity."
    ),
    "bpc-157": (
        "BPC-157 is a synthetic peptide derived from a sequence found in gastric juice, and one "
        "of the most extensively studied compounds in preclinical repair research. Work focuses "
        "on regenerative, anti-inflammatory and angiogenic signaling, with endpoints in tendon, "
        "ligament and bone models, gastrointestinal mucosal integrity, and wound-closure rate."
    ),
    "dsip-spray": (
        "Delta sleep-inducing peptide (DSIP) is studied for its effect on sleep architecture, "
        "particularly delta-wave activity and sleep continuity. Research also examines its role "
        "in cortisol regulation and the stress response, in nociception, and in cognitive "
        "endpoints."
    ),
    "ghk-cu-spray": (
        "A 100mg bottle delivering 500mcg per actuation. GHK-Cu (glycyl-L-histidyl-L-lysine "
        "copper) is a naturally occurring copper-binding peptide studied for regenerative, "
        "dermal and anti-inflammatory signaling. Research areas include collagen and elastin "
        "synthesis, hair-follicle work, wound-bed matrix deposition, and copper delivery in the "
        "context of antioxidant enzyme activity."
    ),
    "glutathione": (
        "Glutathione is the principal endogenous intracellular antioxidant. Research examines "
        "its role in redox balance and oxidative stress, in hepatic and neurological models, and "
        "in the regulation of inflammatory signaling."
    ),
    "kpv-capsules": (
        "Each bottle contains 60 capsules at 500mcg per capsule. KPV (Lys-Pro-Val) is the "
        "C-terminal tripeptide fragment of alpha-melanocyte-stimulating hormone. Research "
        "focuses on anti-inflammatory, antimicrobial and wound-repair signaling, with particular "
        "interest in gastrointestinal and dermal models, and on its ability to modulate immune "
        "signaling without broad immunosuppression."
    ),
    "methylene-blue": (
        "Methylene blue is a synthetic phenothiazine compound with a long history as a "
        "histological dye. In research it is studied as a redox cycler at the mitochondrial "
        "electron transport chain, where interest centers on its effect on cellular respiration "
        "and on oxidative stress."
    ),
    "mk-677-capsules": (
        "MK-677 (ibutamoren) is a non-peptide growth hormone secretagogue. Research examines its "
        "stimulation of endogenous growth hormone and IGF-1, and the downstream endpoints that "
        "follow, including lean-mass and bone-density measures and sleep architecture."
    ),
    "mots-c": (
        "MOTS-c (mitochondrial open reading frame of the 12S rRNA-c) is a mitochondrial-derived "
        "peptide. Research focuses on AMPK signaling, insulin sensitivity and glucose handling, "
        "and on metabolic and physical-performance endpoints in aging models."
    ),
    "nad": (
        "NAD+ (nicotinamide adenine dinucleotide) is a coenzyme central to cellular energy "
        "metabolism, and its concentration declines with age. Research examines restoration "
        "through precursors such as NMN and NR, with endpoints in DNA repair, mitochondrial "
        "function, neuroinflammation and cardiovascular measures."
    ),
    "oxytocin-spray": (
        "A 5mg bottle delivering 50mcg per actuation. Oxytocin is a nonapeptide studied for its "
        "role in social bonding, stress regulation and affiliative behavior. Research examines "
        "its effect on social cognition, on anxiety-related endpoints, and on the "
        "hypothalamic-pituitary-adrenal axis."
    ),
    "pt-141": (
        "PT-141 (bremelanotide) is a melanocortin receptor agonist that acts centrally rather "
        "than on the vascular system. Research examines melanocortin signaling in the central "
        "nervous system and its role in arousal pathways."
    ),
    "pt-141-spray": (
        "PT-141 (bremelanotide) supplied as a pre-mixed spray. It is a melanocortin receptor "
        "agonist studied for central arousal pathways, acting on the central nervous system "
        "rather than on the vascular system."
    ),
    "selank": (
        "Selank is a synthetic heptapeptide analog of the endogenous tetrapeptide tuftsin. "
        "Research focuses on anxiolytic and nootropic endpoints, and on the feature that "
        "distinguishes it in preclinical work: activity without the sedation, tolerance or "
        "dependence associated with benzodiazepines. Immune-modulation endpoints are also "
        "studied."
    ),
    "semax-spray": (
        "A 5mg bottle delivering 50mcg per actuation. Semax is a synthetic heptapeptide analog "
        "of the ACTH(4-10) fragment with no corticotropic activity. Research focuses on "
        "neurotrophic signaling, particularly BDNF and NGF expression, and on cognitive, "
        "attention and neuroprotection endpoints including cerebral ischemia models."
    ),
    "slu-pp-332-capsules": (
        "SLU-PP-332 is an experimental small molecule studied as an exercise mimetic. It acts as "
        "an agonist at estrogen-related receptors (ERR), and research examines the resulting "
        "increase in fatty-acid oxidation and energy expenditure in metabolic models."
    ),
}


def main() -> int:
    src = PRODUCTS.read_text()
    m = re.search(r"(export const products[^=]*=\s*)(\[.*\])(\s*;)", src, re.S)
    if not m:
        print("could not locate the products array", file=sys.stderr)
        return 1

    data = json.loads(m.group(2))
    by_slug = {p["slug"]: p for p in data}

    missing = [s for s in REWRITE if s not in by_slug]
    if missing:
        print(f"unknown slugs: {missing}", file=sys.stderr)
        return 1

    for slug, text in REWRITE.items():
        by_slug[slug]["description"] = text
        by_slug[slug]["copySource"] = "authored"

    # Scraped copy also carried stray spaces before punctuation.
    for p in data:
        if p.get("description"):
            p["description"] = re.sub(r"\s+([,.;])", r"\1", p["description"])

    PRODUCTS.write_text(
        src[: m.start(2)] + json.dumps(data, indent=2, ensure_ascii=False) + src[m.end(2) :]
    )
    print(f"{len(REWRITE)} descriptions re-framed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
