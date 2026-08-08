#!/usr/bin/env python3
"""Clean the scraped `researchAreas` blocks.

Several came across from the live site with SEO-scrape residue baked in -
"according to Perfect B", "explains BHR Center", "National Institutes of Health
(.gov) +6" - alongside treatment framing. Both are fixed here: same endpoints,
house voice, no third-party citations and no claims about what a compound
treats.
"""

import json
import pathlib
import re
import sys

PRODUCTS = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "products.ts"


def A(title, body):
    return {"title": title, "body": body}


AREAS = {
    "aod-9604": [
        A("Lipolysis", "Studied for the mobilization of stored fat, with particular attention to abdominal and visceral adipose depots."),
        A("Lipogenesis", "Investigated for inhibition of new fat formation in metabolic models."),
        A("Glucose Handling", "Examined for the absence of the blood-glucose effects associated with full-length growth hormone."),
        A("Cartilage And Joint Models", "Explored for effects on cartilage matrix in preclinical joint-repair work."),
    ],
    "ara-290": [
        A("Innate Repair Receptor Signaling", "Studied for selective IRR activation, which is distinct from the erythropoietin receptor pathway."),
        A("Small Fiber Neuropathy Models", "Investigated for effects on corneal nerve fiber density and neuropathic endpoints."),
        A("Inflammatory Signaling", "Examined for modulation of tissue inflammation in preclinical models."),
        A("Renal Tissue Protection", "Explored for effects on renal inflammation and kidney injury markers."),
    ],
    "bpc-157": [
        A("Musculoskeletal Regeneration", "Studied for healing rate in injured muscle, tendon, ligament and bone, including tendon-to-bone reconnection."),
        A("Gastrointestinal Barrier Integrity", "Originally investigated for gastric lining protection, and studied in inflammatory bowel and gastric ulcer models."),
        A("Angiogenesis And Wound Healing", "Research shows promotion of blood-vessel formation and collagen production, with endpoints in skin wound and burn repair."),
        A("Systemic Anti-Inflammatory Effects", "Investigated for inflammation and oxidative stress across tissues, including neuroprotection endpoints in stroke and traumatic brain injury models."),
        A("Organ Protection", "Studies indicate protective effects on the liver, pancreas and heart."),
        A("Drug Antagonism", "Researched for its ability to counteract NSAID-induced damage and other substance toxicity in animal models."),
    ],
    "mots-c": [
        A("Metabolic Regulation", "Studied for glucose clearance and insulin sensitivity in high-fat-diet models, where it behaves as an exercise-induced signal."),
        A("Aging And Longevity", "Studies indicate MOTS-c levels decline with age, and that restoring them recovers metabolic homeostasis in aged models."),
        A("Physical Performance And Muscle Function", "Research has shown a doubling of running capacity in mice alongside enhanced skeletal muscle metabolism."),
        A("Cardiovascular Endpoints", "Studies suggest protection against coronary endothelial dysfunction by reducing oxidative stress and inflammation."),
        A("Bone Metabolism", "Research has shown promotion of osteogenic differentiation and preservation of bone mass."),
        A("Neuroprotection", "Research examines neuroinflammation and memory-recognition endpoints."),
    ],
    "nad": [
        A("Cellular Aging And Longevity", "Studies explore how NAD+ activates sirtuins and PARPs, the enzymes that repair DNA and regulate cellular maintenance."),
        A("Neurodegeneration Models", "Research examines neuroinflammation, beta-amyloid burden and cognitive endpoints."),
        A("Metabolic Models", "Studied for insulin sensitivity, hepatic lipid handling and mitochondrial energy production."),
        A("Cardiovascular Endpoints", "Studies investigate blood pressure, arterial stiffness and cardiac function measures."),
        A("Immune Signaling", "Research examines whether raising NAD+ modulates inflammatory cytokine responses."),
        A("Fatigue And Craving Endpoints", "Emerging research examines chronic fatigue and craving measures."),
    ],
    "pinealon": [
        A("Neuroprotection And Cognition", "Studies indicate reduced neuronal apoptosis alongside improved memory and attention endpoints, particularly in aged models."),
        A("Brain Cell Resilience", "Research examines neuronal resistance to hypoxia and excitotoxicity, and reduction of reactive oxygen species."),
        A("Gene Expression And Aging", "Studied as a geroprotector, with endpoints in the expression of genes governing brain protein synthesis."),
        A("Sleep And Mood Regulation", "Studies have examined sleep quality, REM architecture, and circadian disruption from shift patterns."),
        A("Mechanism Of Action", "Believed to act on the central nervous system by promoting gene expression that regulates protein production and synaptic plasticity."),
    ],
    "pt-141": [
        A("Melanocortin Receptor Agonism", "Research focuses on MC4R activation in the central nervous system."),
        A("Central Arousal Pathways", "Studied for centrally mediated arousal signaling rather than vascular mechanisms."),
        A("Comparative Mechanism", "Examined alongside PDE5-pathway compounds, which act on blood flow rather than through the nervous system."),
        A("Receptor Selectivity", "Explored for activity across the melanocortin receptor family."),
    ],
    "slu-pp-332-capsules": [
        A("ERR Agonism", "Studied as an agonist at estrogen-related receptors, the mechanism behind its exercise-mimetic classification."),
        A("Fat Mass And Energy Expenditure", "Studies show reduced fat mass in mice without altered food intake or physical training."),
        A("Insulin Sensitivity", "Investigated for insulin sensitivity and fat accumulation in metabolic models."),
        A("Muscle And Endurance", "Examined for mitochondrial function and oxidative fiber content in skeletal muscle."),
        A("Cardiac And Renal Models", "Explored for endpoints in heart-failure and kidney-dysfunction models."),
    ],
}

DESCRIPTIONS = {
    "mt-ii": (
        "Melanotan II is a synthetic analog of alpha-melanocyte-stimulating hormone. Research "
        "focuses on melanocortin receptor agonism and its downstream effect on melanogenesis and "
        "pigmentation, with secondary interest in appetite and arousal pathways."
    ),
    "tesamorelin": (
        "Tesamorelin is a stabilized analog of human growth-hormone-releasing factor. It is the "
        "most clinically characterized GHRH analog in this catalog, having been studied in "
        "controlled trials for its effect on visceral adipose tissue."
    ),
    "tesofensine-capsules": (
        "Tesofensine is a triple monoamine reuptake inhibitor, blocking reuptake of noradrenaline, "
        "dopamine and serotonin. Originally developed for neurodegenerative indications, it was "
        "redirected into body-weight and appetite research after appetite-suppression effects "
        "were observed in trials."
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

    unknown = [s for s in list(AREAS) + list(DESCRIPTIONS) if s not in by_slug]
    if unknown:
        print(f"unknown slugs: {unknown}", file=sys.stderr)
        return 1

    for slug, areas in AREAS.items():
        by_slug[slug]["researchAreas"] = areas
        by_slug[slug]["copySource"] = "authored"
    for slug, text in DESCRIPTIONS.items():
        by_slug[slug]["description"] = text
        by_slug[slug]["copySource"] = "authored"

    PRODUCTS.write_text(
        src[: m.start(2)] + json.dumps(data, indent=2, ensure_ascii=False) + src[m.end(2) :]
    )
    print(f"{len(AREAS)} research-area blocks and {len(DESCRIPTIONS)} descriptions rewritten")
    return 0


if __name__ == "__main__":
    sys.exit(main())
