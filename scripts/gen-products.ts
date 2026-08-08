/**
 * Generates src/data/products.ts from the scraped catalogue.
 *
 * Input : scripts/catalogue-final.json  (scraped from upgradebiolabs.com)
 * Output: src/data/products.ts
 *
 * Run:    npx tsx scripts/gen-products.ts
 */
import fs from "node:fs";
import path from "node:path";

type Raw = {
  slug: string;
  wooId: string;
  name: string;
  liveCategory: string | null;
  sourceImage: string;
  strength: string | null;
  purity: string;
  outOfStock: boolean;
  stockQty: number | null;
  tiers: Record<string, number>;
  description: string;
  researchAreas: { title: string; body: string }[];
  refs: string[];
  coaUrl: string | null;
};

type Meta = {
  name?: string;
  format?: "vial" | "spray" | "capsule" | "supply";
  presentation?: "lyophilized" | "solution" | "topical";
  goals: string[];
  blend?: string[];
  /** Per-component strengths, index-aligned with `blend`. */
  blendAmounts?: string[];
  countCt?: number;
  volumeMl?: number;
  /** Overrides the mass parsed from the source `strength` string, for the few
   *  SKUs where that field contradicts the product's own description. */
  doseMg?: number;
  /** Overrides the verbatim strength string, where the source is wrong. */
  doseLabel?: string;
  short: string;
  pairsWith?: string[];
  bestseller?: boolean;
  /** authored fallback copy, used only when the live PDP has none */
  description?: string;
  researchAreas?: { title: string; body: string }[];
};

const A = (title: string, body: string) => ({ title, body });

/* ------------------------------------------------------------------ *
 * Per-SKU metadata. `goals`, `short`, blends and cross-sells are
 * classification decisions for this build. `description`/`researchAreas`
 * here are FALLBACKS - live copy always wins when it exists.
 * ------------------------------------------------------------------ */
const META: Record<string, Meta> = {
  /* ---------------- vials: singles ---------------- */
  "bpc-157": {
    goals: ["recovery", "immune"],
    short: "The tissue-repair reference compound. Most reordered SKU we stock.",
    pairsWith: ["tb-500", "kpv", "bac-water-hospira-brand"],
    bestseller: true,
  },
  "tb-500": {
    goals: ["recovery"],
    short: "Thymosin beta-4 fragment studied for soft-tissue repair and scar reduction.",
    pairsWith: ["bpc-157", "wolverine-blendbpc-157-tb-500", "bac-water-hospira-brand"],
  },
  kpv: {
    goals: ["immune"],
    short: "Alpha-MSH tripeptide fragment studied for gut and dermal inflammation.",
    pairsWith: ["bpc-157", "klow-blendbpc-157-tb-500-kpv-ghk-cu", "kpv-capsules"],
    description:
      "KPV is the C-terminal tripeptide fragment (lysine-proline-valine) of alpha-melanocyte-stimulating hormone. It is studied in preclinical models for anti-inflammatory activity that appears to act intracellularly on NF-kB and MAP-kinase signaling rather than through melanocortin receptors, which is why research interest centers on inflammation without pigmentation effects.",
    researchAreas: [
      A("Gastrointestinal Inflammation", "Investigated in colitis models for effects on mucosal barrier integrity and inflammatory cytokine expression."),
      A("Dermal Inflammation", "Studied topically and systemically for wound-bed inflammation and skin irritation models."),
      A("Immune Modulation", "Examined for downregulation of pro-inflammatory signaling without broad immunosuppression."),
      A("Antimicrobial Activity", "Preclinical work has looked at direct activity against certain bacterial and fungal strains."),
    ],
  },
  "ghk-cu": {
    goals: ["skin"],
    short: "Copper tripeptide studied for collagen synthesis and dermal remodelling.",
    pairsWith: ["ghk-cu-spray", "glow-blendbpc-157-tb-500-ghk-cu", "bac-water-hospira-brand"],
    description:
      "GHK-Cu is a naturally occurring copper-binding tripeptide (glycyl-L-histidyl-L-lysine) whose plasma concentration declines with age. It is one of the most extensively studied peptides in dermatological research, where work focuses on its role as a copper carrier and its effect on the extracellular matrix.",
    researchAreas: [
      A("Collagen and Elastin Synthesis", "Studied for stimulation of fibroblast collagen, elastin and glycosaminoglycan production."),
      A("Dermal Remodelling", "Investigated for effects on skin firmness, fine lines and photodamage in controlled trials."),
      A("Wound Healing", "Examined for angiogenesis and matrix deposition in wound-repair models."),
      A("Hair Follicle Research", "Studied for follicle size and anagen-phase signaling."),
      A("Antioxidant Activity", "Copper delivery is investigated in the context of superoxide dismutase activity."),
    ],
  },
  epithalon: {
    goals: ["longevity"],
    short: "Pineal tetrapeptide studied for telomerase activity and circadian signaling.",
    pairsWith: ["pinealon", "nad", "bac-water-hospira-brand"],
    description:
      "Epithalon (Ala-Glu-Asp-Gly) is a synthetic tetrapeptide modelled on epithalamin, a peptide complex isolated from the pineal gland. Research interest centers on its reported effect on telomerase expression and on pineal regulation of circadian and neuroendocrine rhythm.",
    researchAreas: [
      A("Telomerase Activity", "Studied for induction of telomerase in somatic cell cultures and effects on telomere length."),
      A("Circadian Regulation", "Investigated for melatonin rhythm and pineal function in aged animal models."),
      A("Antioxidant Response", "Examined for effects on lipid peroxidation and endogenous antioxidant enzymes."),
      A("Cellular Aging", "Explored in longevity models for markers of replicative senescence."),
    ],
  },
  "mots-c": {
    goals: ["longevity", "metabolic"],
    short: "Mitochondrial-derived peptide studied for AMPK signaling and glucose handling.",
    pairsWith: ["nad", "ss-31", "bac-water-hospira-brand"],
    bestseller: true,
  },
  semax: {
    goals: ["cognitive"],
    short: "ACTH(4-10) analog studied for BDNF expression and attention.",
    pairsWith: ["selank", "semax-selank-spray", "bac-water-hospira-brand"],
    description:
      "Semax is a synthetic heptapeptide analog of the ACTH(4-10) fragment, developed in Russia and studied there in clinical and preclinical neurology settings. It has no corticotropic activity. Research focuses on neurotrophic signaling, particularly BDNF and NGF expression, and on cerebral ischaemia models.",
    researchAreas: [
      A("Neurotrophic Signaling", "Studied for upregulation of BDNF and NGF in hippocampal and cortical tissue."),
      A("Cognitive Performance", "Investigated for attention, working memory and mental fatigue under load."),
      A("Neuroprotection", "Examined in ischaemic stroke and hypoxia models for infarct volume and recovery."),
      A("Stress Adaptation", "Explored for effects on the stress response without HPA-axis stimulation."),
    ],
  },
  selank: {
    goals: ["cognitive"],
    short: "Tuftsin analog studied for anxiolytic activity without sedation.",
    pairsWith: ["semax", "semax-selank-spray", "bac-water-hospira-brand"],
  },
  "pt-141": {
    goals: ["metabolic"],
    short: "Melanocortin receptor agonist studied for central arousal pathways.",
    pairsWith: ["pt-141-spray", "mt-ii", "bac-water-hospira-brand"],
  },
  "mt-ii": {
    goals: ["skin"],
    short: "Melanocortin analog studied for melanogenesis and pigmentation.",
    pairsWith: ["pt-141", "ghk-cu", "bac-water-hospira-brand"],
  },
  dsip: {
    goals: ["cognitive"],
    short: "Delta sleep-inducing peptide studied for slow-wave sleep architecture.",
    pairsWith: ["dsip-spray", "epithalon", "bac-water-hospira-brand"],
    description:
      "DSIP (delta sleep-inducing peptide) is a nonapeptide first isolated from rabbit cerebral venous blood during induced sleep. Research has examined its effect on delta-wave sleep architecture, and separately its interaction with stress-response and neuroendocrine systems.",
    researchAreas: [
      A("Sleep Architecture", "Studied for delta-wave (slow-wave) sleep duration and sleep-onset latency."),
      A("Stress Response", "Investigated for modulation of corticotropin and cortisol under stressor conditions."),
      A("Circadian Signaling", "Examined alongside pineal peptides for rhythm regulation."),
      A("Nociception", "Explored in animal models for analgesic and opioid-withdrawal effects."),
    ],
  },
  ipamorelin: {
    goals: ["recovery", "metabolic"],
    short: "Selective ghrelin receptor agonist studied for pulsatile GH release.",
    pairsWith: ["cjc-1295-no-dac", "cjc-1295-no-dac-ipamorelin-blend", "bac-water-hospira-brand"],
    description:
      "Ipamorelin is a pentapeptide growth hormone secretagogue that acts on the ghrelin/GHS-R1a receptor. Research interest centers on its selectivity: in preclinical work it stimulates growth hormone release with markedly less effect on cortisol, prolactin and ACTH than earlier secretagogues.",
    researchAreas: [
      A("Growth Hormone Release", "Studied for amplitude and pulsatility of GH secretion in pituitary models."),
      A("Receptor Selectivity", "Investigated for GH specificity relative to cortisol, prolactin and ACTH."),
      A("Body Composition", "Examined for lean mass and adipose distribution in animal models."),
      A("Gastric Motility", "Explored via ghrelin-receptor activity in gastrointestinal transit studies."),
    ],
  },
  "cjc-1295-no-dac": {
    goals: ["recovery", "metabolic"],
    short: "GHRH analog (modified GRF 1-29) studied for GH pulse amplitude.",
    pairsWith: ["ipamorelin", "cjc-1295-no-dac-ipamorelin-blend", "bac-water-hospira-brand"],
    description:
      "CJC-1295 without DAC, also called modified GRF (1-29), is a growth-hormone-releasing hormone analog. Removing the drug affinity complex gives it a short half-life, so research protocols study it for a pulse that more closely resembles endogenous GHRH signaling than the DAC-bearing version.",
    researchAreas: [
      A("GHRH Receptor Activity", "Studied for pituitary somatotroph stimulation and GH pulse amplitude."),
      A("Pulsatile Signaling", "Investigated for short-half-life kinetics versus sustained-release analogs."),
      A("IGF-1 Response", "Examined for downstream hepatic IGF-1 expression."),
      A("Secretagogue Synergy", "Explored in combination with ghrelin-receptor agonists in preclinical models."),
    ],
  },
  sermorelin: {
    goals: ["longevity"],
    short: "GHRH(1-29) fragment studied for endogenous growth hormone signaling.",
    pairsWith: ["ipamorelin", "cjc-1295-no-dac", "bac-water-hospira-brand"],
    description:
      "Sermorelin is the synthetic 1-29 amino acid fragment of growth-hormone-releasing hormone, the shortest sequence retaining full biological activity. Because it acts upstream at the pituitary rather than supplying growth hormone directly, research uses it to study intact feedback regulation of the GH axis.",
    researchAreas: [
      A("Pituitary Stimulation", "Studied for somatotroph response and preserved negative feedback."),
      A("Age-Related GH Decline", "Investigated in older-adult models where endogenous GHRH output falls."),
      A("Sleep and GH Pulse", "Examined for the relationship between slow-wave sleep and nocturnal GH release."),
      A("Diagnostic Use", "Historically used as a provocative agent in GH-deficiency testing."),
    ],
  },
  tesamorelin: {
    goals: ["metabolic"],
    short: "Stabilized GHRH analog studied for visceral adipose tissue.",
    pairsWith: ["tesamorelin-ipamorelin-blend", "ipamorelin", "bac-water-hospira-brand"],
    description:
      "Tesamorelin is a stabilized analog of human growth-hormone-releasing factor. It is the most clinically characterized GHRH analog in this catalogue, having been studied in controlled trials for its effect on visceral adipose tissue in specific patient populations.",
    researchAreas: [
      A("Visceral Adipose Tissue", "Studied in controlled trials for reduction of visceral fat measured by CT."),
      A("Lipid Profile", "Investigated for triglyceride and cholesterol fraction changes."),
      A("IGF-1 Axis", "Examined for hepatic IGF-1 response and GH-axis feedback."),
      A("Hepatic Fat", "Explored for effects on liver fat fraction in metabolic research."),
    ],
  },
  "igf-1-lr3": {
    goals: ["recovery"],
    short: "Long-acting IGF-1 analog studied for anabolic and repair signaling.",
    pairsWith: ["bpc-157", "tb-500", "bac-water-hospira-brand"],
    description:
      "IGF-1 LR3 is a modified insulin-like growth factor 1 analog carrying a 13-amino-acid N-terminal extension and an Arg substitution at position 3. Both modifications sharply reduce binding to IGF-binding proteins, which is why research uses it to study extended IGF-1 receptor signaling.",
    researchAreas: [
      A("IGF-1 Receptor Signaling", "Studied for extended half-life relative to native IGF-1 in cell culture."),
      A("Myogenesis", "Investigated for satellite-cell activation and muscle protein synthesis in animal models."),
      A("Tissue Repair", "Examined alongside repair peptides for connective-tissue remodelling."),
      A("Binding Protein Evasion", "Explored for reduced IGFBP affinity and its effect on free-fraction kinetics."),
    ],
  },
  "ll-37": {
    goals: ["immune"],
    short: "Human cathelicidin fragment studied for antimicrobial and immune signaling.",
    pairsWith: ["kpv", "thymosin-alpha-1", "bac-water-hospira-brand"],
    description:
      "LL-37 is the only human cathelicidin-derived antimicrobial peptide, a 37-residue fragment cleaved from hCAP18. Research treats it as a dual-function molecule: a direct membrane-active antimicrobial and a host-defence signaling peptide that recruits and modulates immune cells.",
    researchAreas: [
      A("Antimicrobial Activity", "Studied for membrane disruption across gram-positive, gram-negative and biofilm models."),
      A("Immune Signaling", "Investigated for chemotactic recruitment of neutrophils, monocytes and T cells."),
      A("Wound Repair", "Examined for re-epithelialisation and angiogenesis in wound-healing models."),
      A("Biofilm Disruption", "Explored for activity against established bacterial biofilms."),
    ],
  },
  "thymosin-alpha-1": {
    goals: ["immune"],
    short: "Thymic peptide studied for T-cell maturation and immune modulation.",
    pairsWith: ["ll-37", "kpv", "bac-water-hospira-brand"],
    description:
      "Thymosin alpha-1 is a 28-amino-acid peptide originally isolated from thymosin fraction 5 of the thymus. It is among the most clinically studied immunomodulatory peptides, with research spanning T-cell maturation, dendritic-cell function and adjuvant use in vaccine and antiviral settings.",
    researchAreas: [
      A("T-Cell Maturation", "Studied for thymocyte differentiation and CD4/CD8 population balance."),
      A("Dendritic Cell Function", "Investigated for antigen presentation and Toll-like receptor signaling."),
      A("Antiviral Research", "Examined as an adjunct in chronic viral hepatitis models and trials."),
      A("Vaccine Adjuvancy", "Explored for augmentation of antibody response in immunosenescent models."),
    ],
  },
  "aod-9604": {
    goals: ["metabolic"],
    short: "hGH(177-191) fragment studied for lipolysis without GH-axis activity.",
    pairsWith: ["aod-9604-spray", "tesamorelin", "bac-water-hospira-brand"],
  },
  "ara-290": {
    goals: ["recovery"],
    short: "Erythropoietin-derived peptide studied for neuropathic and tissue repair.",
    pairsWith: ["bpc-157", "ss-31", "bac-water-hospira-brand"],
  },
  "cartalax-injectable": {
    name: "Cartalax",
    goals: ["recovery", "longevity"],
    short: "Cartilage bioregulator tripeptide studied for connective-tissue signaling.",
    pairsWith: ["bpc-157", "tb-500", "bac-water-hospira-brand"],
    description:
      "Cartalax (Ala-Glu-Asp) is a short peptide bioregulator from the Khavinson series, developed to study tissue-specific gene regulation in cartilage and connective tissue. Research examines it as a signaling molecule rather than a structural substrate.",
    researchAreas: [
      A("Cartilage Signaling", "Studied for chondrocyte gene expression and matrix component synthesis."),
      A("Connective Tissue Repair", "Investigated in models of age-related cartilage degradation."),
      A("Inflammatory Markers", "Examined for effects on inflammatory mediators in joint tissue."),
      A("Peptide Bioregulation", "Explored within the broader Khavinson short-peptide framework."),
    ],
  },
  "kisspeptin-10": {
    goals: ["metabolic"],
    short: "KISS1 decapeptide studied for GnRH pulse generation.",
    pairsWith: ["pt-141", "sermorelin", "bac-water-hospira-brand"],
    description:
      "Kisspeptin-10 is the shortest fully active fragment of the KISS1 gene product. It acts on the KISS1R (GPR54) receptor and is recognized in reproductive endocrinology as the principal upstream trigger of gonadotropin-releasing hormone pulsatility.",
    researchAreas: [
      A("GnRH Pulse Generation", "Studied as the upstream regulator of hypothalamic GnRH release."),
      A("Reproductive Endocrinology", "Investigated for LH and FSH response in controlled human and animal studies."),
      A("Puberty Onset", "Examined for the role of KISS1R signaling in pubertal timing."),
      A("Metabolic Crosstalk", "Explored for interaction between energy status and reproductive signaling."),
    ],
  },
  glutathione: {
    goals: ["longevity"],
    short: "Master intracellular antioxidant tripeptide, studied for redox balance.",
    pairsWith: ["glutathione-nasal-spray", "nad", "bac-water-hospira-brand"],
  },
  pinealon: {
    goals: ["cognitive", "longevity"],
    short: "Brain-targeted tripeptide bioregulator studied for neuronal resilience.",
    pairsWith: ["epithalon", "semax", "bac-water-hospira-brand"],
  },
  "ss-31": {
    goals: ["longevity"],
    short: "Cardiolipin-binding peptide studied for mitochondrial membrane function.",
    pairsWith: ["nad", "mots-c", "bac-water-hospira-brand"],
    description:
      "SS-31 (elamipretide) is a mitochondria-targeting tetrapeptide that concentrates in the inner mitochondrial membrane through selective binding to cardiolipin. Research focuses on cristae architecture and electron-transport efficiency rather than on general antioxidant activity.",
    researchAreas: [
      A("Cardiolipin Binding", "Studied for stabilization of the inner mitochondrial membrane and cristae structure."),
      A("Electron Transport", "Investigated for ATP production efficiency and reactive oxygen species leak."),
      A("Cardiac and Renal Models", "Examined in ischaemia-reperfusion and mitochondrial-myopathy research."),
      A("Age-Related Decline", "Explored for mitochondrial function in aged skeletal muscle."),
    ],
  },
  nad: {
    name: "NAD+",
    goals: ["longevity"],
    short: "Redox cofactor central to sirtuin and mitochondrial energy research.",
    pairsWith: ["nad-500-spray", "mots-c", "ss-31"],
  },
  cagrilintide: {
    goals: ["metabolic"],
    short: "Long-acting amylin analog studied for satiety signaling.",
    pairsWith: ["rt-3", "tz-2", "bac-water-hospira-brand"],
    description:
      "Cagrilintide is a long-acting amylin analog engineered for extended half-life. Amylin is co-secreted with insulin from pancreatic beta cells, and research examines cagrilintide for satiety signaling and gastric emptying, particularly in combination with incretin-pathway compounds.",
    researchAreas: [
      A("Amylin Receptor Signaling", "Studied for activity at calcitonin and amylin receptor complexes."),
      A("Satiety and Food Intake", "Investigated for effects on meal termination and caloric intake."),
      A("Gastric Emptying", "Examined for delayed gastric transit as a satiety mechanism."),
      A("Combination Research", "Explored alongside incretin analogs in metabolic study designs."),
    ],
  },
  /* RT-3 is a TRIPLE agonist and TZ-2 a DUAL one. An earlier pass had RT-3 as
   * dual and TZ-2 as a plain GLP-1 agonist; the client caught it. "GLP" is
   * spelled out throughout at their request. */
  "rt-3": {
    goals: ["metabolic"],
    short: "Research-grade triple receptor agonist for metabolic study designs.",
    pairsWith: ["tz-2", "cagrilintide", "bac-water-hospira-brand"],
    bestseller: true,
    description:
      "RT-3 is supplied as a research-grade triple receptor agonist, acting at the glucagon-like peptide-1, glucose-dependent insulinotropic polypeptide, and glucagon receptors. Triple-agonist research examines whether adding glucagon-receptor activity to combined incretin signaling produces effects on energy expenditure and body composition beyond what dual agonism achieves.",
    researchAreas: [
      A("Triple Receptor Signaling", "Studied for simultaneous activity at the glucagon-like peptide-1, glucose-dependent insulinotropic polypeptide, and glucagon receptors."),
      A("Energy Expenditure", "Investigated for the glucagon-receptor contribution to resting metabolic rate."),
      A("Body Composition", "Examined for fat-mass and lean-mass distribution in metabolic models."),
      A("Gastric Emptying", "Explored for transit delay and its contribution to satiety signaling."),
    ],
  },
  "tz-2": {
    goals: ["metabolic"],
    short: "Research-grade dual incretin receptor agonist.",
    pairsWith: ["rt-3", "cagrilintide", "bac-water-hospira-brand"],
    description:
      "TZ-2 is supplied as a research-grade dual incretin receptor agonist, acting at both the glucose-dependent insulinotropic polypeptide and glucagon-like peptide-1 receptors. Dual-agonist research examines whether combined incretin signaling produces effects on glucose handling and body composition beyond what single-receptor agonism achieves.",
    researchAreas: [
      A("Dual Incretin Signaling", "Studied for simultaneous activation of the glucose-dependent insulinotropic polypeptide and glucagon-like peptide-1 receptors."),
      A("Glycemic Control", "Investigated for glucose-dependent insulin secretion and glucagon suppression."),
      A("Gastric Emptying", "Examined for transit delay and its contribution to satiety."),
      A("Body Composition", "Explored for adipose and lean-mass distribution in animal models."),
    ],
  },
  "methylene-blue": {
    format: "vial",
    presentation: "solution",
    goals: ["longevity"],
    short: "Pharmaceutical-grade solution studied as a mitochondrial electron cycler.",
    pairsWith: ["nad", "ss-31", "mots-c"],
  },
  "5-amino-1-mq": {
    format: "capsule",
    goals: ["metabolic"],
    countCt: 60,
    short: "NNMT inhibitor studied for adipocyte metabolism and NAD salvage.",
    pairsWith: ["nad", "slu-pp-332-capsules", "tesofensine-capsules"],
  },

  /* ---------------- vials: blends ---------------- */
  "klow-blendbpc-157-tb-500-kpv-ghk-cu": {
    name: "KLOW Blend",
    blend: ["BPC-157", "TB-500", "KPV", "GHK-Cu"],
    goals: ["recovery", "immune", "skin"],
    short: "Four-peptide repair stack. Tissue, gut, and dermal in one vial.",
    pairsWith: ["bac-water-hospira-brand", "klow-capsulesbpc-157-tb-500-kpv-ghk-cu", "bpc-157"],
    bestseller: true,
    description:
      "KLOW combines four of the most studied repair and modulation peptides in a single lyophilized vial: BPC-157 and TB-500 for soft-tissue and connective-tissue research, KPV for inflammatory signaling, and GHK-Cu for dermal matrix work. It is supplied as a blend so a single reconstitution covers all four research targets.",
    researchAreas: [
      A("Musculoskeletal Regeneration", "BPC-157 and TB-500 are both studied for tendon, ligament and muscle repair signaling."),
      A("Gastrointestinal Barrier Integrity", "BPC-157 and KPV are examined for mucosal barrier and colitis models."),
      A("Angiogenesis and Wound Healing", "Investigated for blood-vessel formation and wound-bed closure rate."),
      A("Dermal Collagen Synthesis", "GHK-Cu contributes the collagen, elastin and glycosaminoglycan research axis."),
      A("Inflammatory Signaling", "KPV is studied for NF-kB pathway downregulation without broad immunosuppression."),
    ],
  },
  "wolverine-blendbpc-157-tb-500": {
    name: "Wolverine Blend",
    blend: ["BPC-157", "TB-500"],
    goals: ["recovery"],
    short: "The two core repair peptides, pre-blended in one vial.",
    pairsWith: ["bac-water-hospira-brand", "wolverine-blend-spraybpc-157-tb-500", "klow-blendbpc-157-tb-500-kpv-ghk-cu"],
    bestseller: true,
    description:
      "The Wolverine Blend pairs BPC-157 and TB-500, the two most frequently co-studied peptides in soft-tissue repair research. BPC-157 work centers on angiogenesis and tendon-to-bone signaling; TB-500 work centers on actin regulation and cell migration. Supplied pre-blended so one reconstitution covers both.",
    researchAreas: [
      A("Tendon and Ligament Repair", "Both compounds are studied for connective-tissue healing rate and tensile recovery."),
      A("Actin Regulation and Cell Migration", "TB-500 is investigated for actin sequestration and fibroblast migration."),
      A("Angiogenesis", "BPC-157 is examined for new blood-vessel formation in injured tissue."),
      A("Scar Tissue Modulation", "Explored for fibrosis and adhesion formation in repair models."),
    ],
  },
  "glow-blendbpc-157-tb-500-ghk-cu": {
    name: "Glow Blend",
    blend: ["BPC-157", "TB-500", "GHK-Cu"],
    goals: ["skin", "recovery"],
    short: "Repair pair plus copper tripeptide, weighted toward dermal research.",
    pairsWith: ["bac-water-hospira-brand", "ghk-cu", "klow-blendbpc-157-tb-500-kpv-ghk-cu"],
    bestseller: true,
    description:
      "Glow combines the BPC-157 and TB-500 repair pair with a 50mg load of GHK-Cu, shifting the blend toward dermal and cosmetic research. The copper tripeptide carries the collagen and extracellular-matrix axis while the repair peptides cover angiogenesis and tissue remodelling.",
    researchAreas: [
      A("Dermal Collagen Synthesis", "GHK-Cu is studied for fibroblast collagen and elastin production."),
      A("Skin Remodelling", "Investigated for firmness, fine lines and photodamage markers."),
      A("Wound Healing", "Examined for re-epithelialisation and matrix deposition."),
      A("Angiogenesis", "BPC-157 contributes the vascular-formation research axis."),
      A("Hair Follicle Research", "GHK-Cu is explored for follicle size and anagen signaling."),
    ],
  },
  "tesamorelin-ipamorelin-blend": {
    name: "Tesamorelin + Ipamorelin",
    blend: ["Tesamorelin", "Ipamorelin"],
    goals: ["metabolic"],
    short: "GHRH analog plus selective secretagogue in one vial.",
    pairsWith: ["bac-water-hospira-brand", "tesamorelin", "ipamorelin"],
    description:
      "This blend pairs a GHRH analog with a selective ghrelin-receptor secretagogue, the two-axis approach most commonly used in growth-hormone research. Tesamorelin acts at the GHRH receptor to raise pulse amplitude; ipamorelin acts at GHS-R1a with minimal cortisol or prolactin cross-activity.",
    researchAreas: [
      A("Dual-Pathway GH Release", "Studied for the additive effect of GHRH and ghrelin-receptor stimulation."),
      A("Visceral Adipose Tissue", "Tesamorelin contributes the visceral-fat research axis."),
      A("IGF-1 Response", "Examined for downstream hepatic IGF-1 expression."),
      A("Receptor Selectivity", "Ipamorelin is investigated for GH specificity versus cortisol and prolactin."),
    ],
  },
  "cjc-1295-no-dac-ipamorelin-blend": {
    name: "CJC-1295 no DAC + Ipamorelin",
    blend: ["CJC-1295 no DAC", "Ipamorelin"],
    goals: ["recovery", "metabolic"],
    short: "The classic GHRH plus secretagogue pairing, pre-blended.",
    pairsWith: ["bac-water-hospira-brand", "cjc-1295-no-dac", "ipamorelin"],
    description:
      "The most frequently studied secretagogue pairing in growth-hormone research. Modified GRF (1-29) supplies the GHRH-receptor signal and ipamorelin supplies the ghrelin-receptor signal, an approach used to study pulse amplitude and frequency together rather than in isolation.",
    researchAreas: [
      A("Synergistic GH Release", "Studied for the combined effect of two distinct pituitary signaling pathways."),
      A("Pulsatile Kinetics", "Investigated for short-half-life pulse shape versus sustained-release analogs."),
      A("IGF-1 Axis", "Examined for hepatic IGF-1 response to repeated pulses."),
      A("Receptor Selectivity", "Explored for minimal cortisol and prolactin cross-activation."),
    ],
  },
  "the-hair-blendminoxidil-ru-58841-finasteride": {
    name: "The Hair Blend",
    format: "vial",
    presentation: "topical",
    blend: ["Minoxidil", "RU-58841", "Finasteride"],
    goals: ["skin"],
    volumeMl: 60,
    short: "Three-agent topical solution for follicle and androgen-pathway research.",
    pairsWith: ["ghk-cu", "ghk-cu-spray", "glow-blendbpc-157-tb-500-ghk-cu"],
    description:
      "A topical research solution combining three compounds with distinct mechanisms in hair-follicle study: minoxidil as a potassium-channel opener and vasodilator, RU-58841 as a topical androgen-receptor antagonist, and finasteride as a 5-alpha-reductase inhibitor. Supplied as a pre-mixed solution for topical laboratory use.",
    researchAreas: [
      A("Follicle Vascularisation", "Minoxidil is studied for perifollicular blood flow and anagen-phase extension."),
      A("Androgen Receptor Antagonism", "RU-58841 is investigated for local receptor blockade with limited systemic exposure."),
      A("5-Alpha-Reductase Inhibition", "Finasteride contributes the DHT-conversion research axis."),
      A("Combination Topicals", "Explored for additive effects across three separate pathways."),
    ],
  },

  /* ---------------- sprays ---------------- */
  "bpc-157-spray": {
    goals: ["recovery"],
    volumeMl: 15,
    short: "BPC-157 pre-mixed for measured nasal actuation. No reconstitution.",
    pairsWith: ["kpv-spray", "wolverine-blend-spraybpc-157-tb-500", "bpc-157"],
    description:
      "BPC-157 supplied as a pre-mixed spray. The compound and its research profile are identical to the lyophilized vial; the difference is presentation. Nasal delivery is studied for its avoidance of first-pass metabolism and for direct nose-to-brain transport routes.",
    researchAreas: [
      A("Musculoskeletal Regeneration", "Studied for tendon, ligament and muscle repair signaling."),
      A("Gastrointestinal Health", "Investigated for mucosal barrier integrity and ulcer models."),
      A("Angiogenesis and Wound Healing", "Examined for blood-vessel formation and collagen deposition."),
      A("Intranasal Delivery", "Explored for bioavailability relative to parenteral administration."),
    ],
  },
  "kpv-spray": {
    goals: ["immune"],
    volumeMl: 15,
    short: "KPV pre-mixed for nasal actuation. Inflammatory-signaling research.",
    pairsWith: ["bpc-157-spray", "kpv", "kpv-capsules"],
    description:
      "KPV supplied as a pre-mixed spray at 10mg per bottle, delivering 50mcg per actuation. KPV is the C-terminal tripeptide of alpha-MSH, studied for anti-inflammatory activity that acts on intracellular NF-kB signaling rather than through melanocortin receptors, so research interest centers on inflammation without pigmentation effects.",
    researchAreas: [
      A("Gastrointestinal Inflammation", "Investigated in colitis models for mucosal barrier integrity and cytokine expression."),
      A("Dermal Inflammation", "Studied for wound-bed inflammation and skin irritation models."),
      A("Immune Modulation", "Examined for downregulation of pro-inflammatory signaling without broad immunosuppression."),
      A("Intranasal Delivery", "Explored for measured-dose administration without reconstitution."),
    ],
  },
  "ghk-cu-spray": {
    goals: ["skin"],
    volumeMl: 15,
    short: "Copper tripeptide in a measured nasal format.",
    pairsWith: ["ghk-cu", "glow-blendbpc-157-tb-500-ghk-cu", "the-hair-blendminoxidil-ru-58841-finasteride"],
  },
  "aod-9604-spray": {
    goals: ["metabolic"],
    volumeMl: 15,
    short: "AOD-9604 pre-mixed. Lipolysis research without reconstitution.",
    pairsWith: ["aod-9604", "glutathione-nasal-spray", "nad-500-spray"],
    description:
      "AOD-9604 supplied as a pre-mixed spray at 5mg per bottle, delivering 50mcg per actuation. AOD-9604 is the C-terminal 177-191 fragment of human growth hormone, studied specifically because it appears to retain the lipolytic activity of the parent hormone without the growth-promoting or insulin-antagonising effects.",
    researchAreas: [
      A("Lipolysis", "Studied for stimulation of fat breakdown in adipose tissue models."),
      A("Lipogenesis Inhibition", "Investigated for suppression of new fat formation."),
      A("GH-Axis Independence", "Examined for absence of IGF-1 elevation and insulin resistance seen with full-length hGH."),
      A("Intranasal Delivery", "Explored for measured-dose administration without reconstitution."),
    ],
  },
  "dsip-spray": {
    goals: ["cognitive"],
    volumeMl: 15,
    short: "Delta sleep-inducing peptide in a measured nasal format.",
    pairsWith: ["dsip", "selank-spray", "semax-spray"],
  },
  "glutathione-nasal-spray": {
    name: "Glutathione Spray",
    goals: ["longevity"],
    volumeMl: 15,
    short: "500mg glutathione per bottle, pre-mixed for nasal actuation.",
    pairsWith: ["glutathione", "nad-500-spray", "aod-9604-spray"],
    description:
      "Glutathione supplied as a pre-mixed spray at 500mg per bottle. Glutathione is the principal intracellular antioxidant and redox buffer; research on non-oral delivery routes centers on the poor oral bioavailability of the intact tripeptide.",
    researchAreas: [
      A("Redox Balance", "Studied as the primary intracellular antioxidant and reduced/oxidised ratio marker."),
      A("Detoxification Pathways", "Investigated for phase II conjugation and xenobiotic clearance."),
      A("Delivery Route", "Examined for bioavailability of intact glutathione versus oral administration."),
      A("Oxidative Stress Models", "Explored for markers of lipid peroxidation and protein carbonylation."),
    ],
  },
  "nad-500-spray": {
    name: "NAD+ 500 Spray",
    goals: ["longevity"],
    volumeMl: 15,
    short: "500mg NAD+ per bottle. Mitochondrial and sirtuin research.",
    pairsWith: ["nad", "glutathione-nasal-spray", "mots-c"],
  },
  "oxytocin-spray": {
    goals: ["cognitive"],
    volumeMl: 15,
    short: "Nonapeptide studied for social cognition and affiliative behavior.",
    pairsWith: ["selank-spray", "pt-141-spray", "semax-spray"],
  },
  "pt-141-spray": {
    goals: ["metabolic"],
    volumeMl: 15,
    short: "PT-141 pre-mixed. Melanocortin arousal-pathway research.",
    pairsWith: ["pt-141", "oxytocin-spray", "mt-ii"],
  },
  "selank-spray": {
    goals: ["cognitive"],
    volumeMl: 15,
    short: "Selank pre-mixed for nasal actuation. Anxiolytic-pathway research.",
    pairsWith: ["semax-spray", "semax-selank-spray", "selank"],
    description:
      "Selank supplied as a pre-mixed spray. Selank is a synthetic heptapeptide analog of the immunomodulatory peptide tuftsin, studied for anxiolytic activity that in preclinical work does not carry the sedation or dependence profile of benzodiazepines.",
    researchAreas: [
      A("Anxiolytic Activity", "Studied in anxiety models for effect without sedation or motor impairment."),
      A("GABAergic Modulation", "Investigated for indirect effects on GABA-A receptor expression."),
      A("BDNF Expression", "Examined for neurotrophic signaling in hippocampal tissue."),
      A("Immune Signaling", "Explored via its tuftsin parent sequence for immunomodulatory activity."),
    ],
  },
  "semax-spray": {
    goals: ["cognitive"],
    volumeMl: 15,
    short: "Semax pre-mixed. Nose-to-brain delivery is the studied route.",
    pairsWith: ["selank-spray", "semax-selank-spray", "semax"],
  },
  "semax-selank-spray": {
    name: "Semax / Selank Spray",
    blend: ["Semax", "Selank"],
    goals: ["cognitive"],
    volumeMl: 15,
    // The catalogue's strength field reads "5mg per bottle", but this SKU's own
    // PDP copy states 5mg of Semax AND 5mg of Selank. Since $/mg is a headline
    // claim, we take the description over the ambiguous strength field.
    doseMg: 10,
    short: "The two Russian nootropic peptides in one measured bottle.",
    pairsWith: ["dihexa-semax-selank-spray", "semax-spray", "selank-spray"],
    bestseller: true,
    description:
      "Semax and Selank supplied together as a pre-mixed spray at 5mg of each per bottle. The two are the most frequently co-studied peptides from the Russian neuropeptide program: Semax is an ACTH(4-10) analog studied for BDNF expression and attention, Selank a tuftsin analog studied for anxiolytic activity without sedation.",
    researchAreas: [
      A("Neurotrophic Signaling", "Semax is studied for BDNF and NGF upregulation in cortical and hippocampal tissue."),
      A("Anxiolytic Activity", "Selank is investigated in anxiety models without sedation or motor impairment."),
      A("Cognitive Performance", "Examined for attention, working memory and mental fatigue under load."),
      A("Intranasal Delivery", "Explored for nose-to-brain transport of peptide molecules."),
    ],
  },
  "dihexa-semax-selank-spray": {
    name: "Dihexa / Semax / Selank Spray",
    blend: ["Dihexa", "Semax", "Selank"],
    goals: ["cognitive"],
    volumeMl: 15,
    short: "Three-peptide cognitive stack. Dihexa adds HGF/c-Met signaling.",
    pairsWith: ["semax-selank-spray", "semax-spray", "selank-spray"],
    description:
      "A three-peptide nasal blend combining Dihexa, Semax and Selank. Dihexa is an angiotensin IV analog studied for hepatocyte growth factor and c-Met receptor signaling in synaptogenesis research; Semax and Selank contribute the BDNF and anxiolytic research axes respectively.",
    researchAreas: [
      A("Synaptogenesis", "Dihexa is studied for HGF/c-Met signaling and dendritic spine formation."),
      A("Neurotrophic Expression", "Semax contributes BDNF and NGF upregulation research."),
      A("Anxiolytic Activity", "Selank is investigated for anxiety models without sedation."),
      A("Intranasal Delivery", "Explored for nose-to-brain transport of larger peptide molecules."),
    ],
  },
  "wolverine-blend-spraybpc-157-tb-500": {
    name: "Wolverine Blend Spray",
    blend: ["BPC-157", "TB-500"],
    goals: ["recovery"],
    volumeMl: 15,
    short: "The repair pair, pre-mixed for nasal actuation.",
    pairsWith: ["bpc-157-spray", "wolverine-blendbpc-157-tb-500", "kpv-spray"],
    description:
      "The BPC-157 and TB-500 repair pairing supplied as a pre-mixed spray at 5mg of each per bottle. Same two compounds as the lyophilized Wolverine Blend, presented for measured actuation without reconstitution.",
    researchAreas: [
      A("Tendon and Ligament Repair", "Both compounds are studied for connective-tissue healing signaling."),
      A("Actin Regulation", "TB-500 is investigated for actin sequestration and cell migration."),
      A("Angiogenesis", "BPC-157 is examined for new blood-vessel formation."),
      A("Intranasal Delivery", "Explored for systemic bioavailability via the nasal route."),
    ],
  },

  /* ---------------- capsules ---------------- */
  "bpc-157-capsules": {
    goals: ["recovery"],
    countCt: 60,
    short: "500mcg per capsule, 60 count. Oral gut-barrier research format.",
    pairsWith: ["kpv-capsules", "klow-capsulesbpc-157-tb-500-kpv-ghk-cu", "bpc-157"],
    bestseller: true,
  },
  "kpv-capsules": {
    goals: ["immune"],
    countCt: 60,
    short: "500mcg per capsule, 60 count. Oral inflammatory-signaling research.",
    pairsWith: ["bpc-157-capsules", "klow-capsulesbpc-157-tb-500-kpv-ghk-cu", "kpv"],
  },
  "ghk-cu-capsules": {
    goals: ["skin"],
    countCt: 60,
    short: "2mg per capsule, 60 count. Oral copper-tripeptide format.",
    pairsWith: ["ghk-cu", "klow-capsulesbpc-157-tb-500-kpv-ghk-cu", "bpc-157-capsules"],
  },
  "klow-capsulesbpc-157-tb-500-kpv-ghk-cu": {
    name: "KLOW Capsules",
    // Client-confirmed split, index-aligned. The scraped strength string read
    // "500 MCG, 1MG Per Capsule", which was wrong on both counts.
    blend: ["BPC-157", "TB-500", "GHK-Cu", "KPV"],
    blendAmounts: ["500 mcg", "500 mcg", "2 mg", "500 mcg"],
    doseLabel: "500 MCG / 500 MCG / 2 MG / 500 MCG Per Capsule",
    doseMg: 210, // 3.5mg per capsule x 60
    goals: ["recovery", "immune", "skin"],
    countCt: 60,
    short: "The four-peptide KLOW stack in an oral 60-count bottle.",
    pairsWith: ["klow-blendbpc-157-tb-500-kpv-ghk-cu", "bpc-157-capsules", "kpv-capsules"],
    description:
      "The KLOW four-peptide combination in oral capsule form: 500mcg BPC-157, 500mcg TB-500, 2mg GHK-Cu and 500mcg KPV per capsule, 60 capsules per bottle. Oral research formats are studied primarily for gastrointestinal-tract effects, where local mucosal exposure rather than systemic bioavailability is the endpoint.",
    researchAreas: [
      A("Gastrointestinal Barrier Integrity", "BPC-157 and KPV are studied for mucosal barrier and colitis models."),
      A("Local Mucosal Exposure", "Oral formats are investigated for direct gut-lining contact."),
      A("Inflammatory Signaling", "KPV contributes NF-kB pathway research."),
      A("Connective Tissue Repair", "BPC-157 and TB-500 supply the tissue-repair research axis."),
    ],
  },
  "slu-pp-332-capsules": {
    name: "SLU-PP-332 Capsules",
    goals: ["metabolic"],
    countCt: 60,
    short: "ERR agonist studied as an exercise-mimetic pathway.",
    pairsWith: ["5-amino-1-mq", "tesofensine-capsules", "mk-677-capsules"],
  },
  "tesofensine-capsules": {
    goals: ["metabolic"],
    countCt: 60,
    short: "Triple monoamine reuptake inhibitor studied for appetite regulation.",
    pairsWith: ["slu-pp-332-capsules", "5-amino-1-mq", "rt-3"],
    bestseller: true,
    description:
      "Tesofensine is a triple monoamine reuptake inhibitor, blocking reuptake of noradrenaline, dopamine and serotonin. Originally developed for neurodegenerative indications, it was redirected into obesity research after appetite-suppression effects were observed in trials.",
    researchAreas: [
      A("Monoamine Reuptake Inhibition", "Studied for combined noradrenaline, dopamine and serotonin transporter blockade."),
      A("Appetite Regulation", "Investigated for effects on hunger scores and caloric intake in controlled trials."),
      A("Energy Expenditure", "Examined for resting metabolic rate contribution."),
      A("Body Composition", "Explored for fat-mass change in metabolic study designs."),
    ],
  },
  "mk-677-capsules": {
    goals: ["metabolic"],
    countCt: 60,
    short: "Oral ghrelin mimetic studied for sustained GH and IGF-1 elevation.",
    pairsWith: ["ipamorelin", "slu-pp-332-capsules", "tesofensine-capsules"],
  },

  /* ---------------- supplies ---------------- */
  "bac-water-hospira-brand": {
    name: "BAC Water - Hospira",
    format: "supply",
    goals: [],
    volumeMl: 30,
    short: "30ml bacteriostatic water. Hospira brand, benzyl alcohol preserved.",
    pairsWith: ["bpc-157", "klow-blendbpc-157-tb-500-kpv-ghk-cu", "tb-500"],
    description:
      "Bacteriostatic water for reconstitution, Hospira brand, 30ml multi-dose vial preserved with 0.9% benzyl alcohol. The preservative is what allows repeated withdrawals from a single vial without microbial growth, which is why it is the standard diluent for lyophilized research peptides.",
    researchAreas: [],
  },
  "bac-water-3ml": {
    name: "BAC Water 3ml",
    format: "supply",
    goals: [],
    volumeMl: 3,
    short: "3ml bacteriostatic water for single-vial reconstitution.",
    pairsWith: ["bac-water-hospira-brand", "bpc-157", "tb-500"],
    description:
      "Bacteriostatic water for reconstitution in a 3ml vial, preserved with benzyl alcohol. Sized for single-vial reconstitution where a 30ml multi-dose vial would exceed the working volume needed.",
    researchAreas: [],
  },
};

/* ------------------------------------------------------------------ */

const raw: Raw[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "catalogue-final.json"), "utf8")
);

/** Total peptide mass in mg from the source strength string. */
function parseDoseMg(strength: string | null, countCt?: number): number | undefined {
  if (!strength) return undefined;
  const s = strength.toLowerCase();
  if (/\bml\b/.test(s) && !/mg|mcg/.test(s)) return undefined; // pure volume (BAC water)
  // Concentrations ("12 MG/ML", "25 MG/ML") describe strength per millilitre,
  // not total mass in the container. Dividing price by that yields a wrong
  // $/mg, so we omit the figure rather than print a misleading one.
  if (/\/\s*ml/.test(s)) return undefined;
  if (/per spray/.test(s)) return undefined; // per-actuation dose, not bottle total

  // Blends sometimes share one trailing unit across slash-separated values
  // ("5/5/5 MG in each Bottle"). Expand those so each component is counted.
  const expanded = s.replace(
    /(\d[\d.]*(?:\s*\/\s*\d[\d.]*)+)\s*(mcg|mg)\b/g,
    (_, nums: string, unit: string) =>
      nums.split("/").map((n) => `${n.trim()} ${unit}`).join(" ")
  );

  const matches = [...expanded.matchAll(/([\d.]+)\s*(mcg|mg)/g)];
  if (!matches.length) return undefined;

  let total = 0;
  for (const m of matches) {
    const v = parseFloat(m[1]);
    total += m[2] === "mcg" ? v / 1000 : v;
  }

  // A capsule SKU's strength is per capsule, whether or not the source string
  // says so. Several read just "500 MCG"; taking that as the bottle total
  // yields a $230/mg figure that is off by the capsule count.
  if (countCt) total *= countCt;

  return Math.round(total * 1000) / 1000;
}

function formatFor(r: Raw, meta: Meta): "vial" | "spray" | "capsule" | "supply" {
  if (meta.format) return meta.format;
  switch (r.liveCategory) {
    case "sprays": return "spray";
    case "capsules": return "capsule";
    case "peptides":
    case "peptide-blends":
    case "liquids":
    default: return "vial";
  }
}

/**
 * We deliberately do NOT derive a batch number from the COA filename.
 * Filenames like "BPCCOA326.pdf" are not batch identifiers, and printing an
 * invented "batch #" next to a COA link is a trust claim we cannot support.
 * The PDP links the real COA and labels it as such. When the client supplies
 * real batch IDs, populate `coaBatch` here and the PDP will render it.
 */
const KNOWN_BATCH: Record<string, string> = {};

const TIER_ORDER = ["1-2", "3-5", "5+"];
const TIER_MIN: Record<string, number> = { "1-2": 1, "3-5": 3, "5+": 5 };

/**
 * SKUs whose live copy must never be used. Each of these arrived from
 * upgradebiolabs.com describing what the compound "treats", naming specific
 * diseases, or trailing scraped citations. Authored copy wins for these
 * regardless of length.
 */
const FORCE_AUTHORED = new Set([
  "5-amino-1-mq", "aod-9604", "ara-290", "bpc-157", "dsip-spray",
  "ghk-cu-spray", "glutathione", "kpv-capsules", "methylene-blue",
  "mk-677-capsules", "mots-c", "mt-ii", "nad", "oxytocin-spray",
  "pinealon", "pt-141", "pt-141-spray", "selank", "semax-spray",
  "slu-pp-332-capsules", "tesamorelin", "tesofensine-capsules",
]);

/**
 * Fill sizes the client sells beyond the scraped default. A size with `tiers:
 * null` is one they have confirmed exists but not yet priced; the PDP shows it
 * disabled rather than inventing a number.
 */
const SIZES: Record<string, { label: string; doseMg: number; doseLabel: string; scraped?: true }[]> = {
  "rt-3": [
    { label: "10mg", doseMg: 10, doseLabel: "10 MG", scraped: true },
    { label: "20mg", doseMg: 20, doseLabel: "20 MG" },
  ],
  "tz-2": [
    { label: "10mg", doseMg: 10, doseLabel: "10 MG", scraped: true },
    { label: "20mg", doseMg: 20, doseLabel: "20 MG" },
  ],
  "wolverine-blendbpc-157-tb-500": [
    { label: "5mg / 5mg", doseMg: 10, doseLabel: "5 MG/ 5 MG", scraped: true },
    { label: "10mg / 10mg", doseMg: 20, doseLabel: "10 MG/ 10 MG" },
  ],
};

const products = raw.map((r) => {
  const meta = META[r.slug];
  if (!meta) throw new Error(`No META entry for slug: ${r.slug}`);

  const format = formatFor(r, meta);
  const countCt = meta.countCt;
  const doseMg = meta.doseMg ?? parseDoseMg(r.strength, countCt);

  // Tiers, in ladder order, from the real per-variation prices.
  const bands = TIER_ORDER.filter((b) => r.tiers[b] != null);
  const prices = bands.map((b) => r.tiers[b]);
  const basePrice = prices[0];

  const distinct = new Set(prices).size;
  const tiers = bands.map((b, i) => {
    const tier: { minQty: number; unitPrice: number; label?: string } = {
      minQty: TIER_MIN[b],
      unitPrice: r.tiers[b],
    };
    // Only label a ladder that actually discounts.
    if (distinct > 1) {
      if (i === 0) tier.label = "most popular";
      if (i === bands.length - 1) tier.label = "best value";
    }
    return tier;
  });

  // Live copy wins when it is substantive. Several live PDPs carry only a
  // one-line dosing blurb ("Easy and convenient delivery option"); where we
  // have real authored copy, that reads better on a PDP than the blurb.
  //
  // FORCE_AUTHORED overrides that: for those SKUs the live copy makes
  // treatment claims, names diseases as targets, or carries SEO-scrape
  // residue ("according to Perfect B"), none of which can ship on a
  // research-use-only site. Authored copy always wins there.
  const live = r.description.trim();
  const forced = FORCE_AUTHORED.has(r.slug);
  const useLive =
    !forced && (live.length > 200 || (live.length > 60 && !meta.description));
  const description = useLive ? live : (meta.description ?? live);
  const liveAreas = forced ? [] : r.researchAreas.filter((a) => a.title && a.body);
  const researchAreas = liveAreas.length ? liveAreas : (meta.researchAreas ?? []);

  return {
    slug: r.slug,
    name: meta.name ?? r.name,
    format,
    presentation:
      meta.presentation ?? (format === "vial" ? "lyophilized" : undefined),
    goals: meta.goals,
    blend: meta.blend,
    blendAmounts: meta.blendAmounts,
    // The scraped ladder belongs to whichever fill the live site sells; the
    // others stay unpriced until the client sends numbers.
    sizes: SIZES[r.slug]?.map((s) => ({
      label: s.label,
      doseMg: s.doseMg,
      doseLabel: s.doseLabel,
      tiers: s.scraped ? tiers : null,
    })),
    doseMg,
    // A client-confirmed strength always beats the scraped one.
    doseLabel: meta.doseLabel ?? r.strength ?? undefined,
    volumeMl: meta.volumeMl,
    countCt,
    purity: r.purity || "≥99%",
    basePrice,
    tiers,
    coaUrl: r.coaUrl ?? undefined,
    coaBatch: KNOWN_BATCH[r.slug],
    refs: r.refs.length ? r.refs : undefined,
    // A positive stock count beats the boolean. The scraped `outOfStock` flag
    // disagreed with `stockQty` on three SKUs - Wolverine Blend was flagged
    // out of stock with 7 units in hand - and the count is the field that
    // actually tracks the warehouse. Verify against the live badge with
    // `npx tsx scripts/verify-stock.ts` before shipping a regenerated file.
    inStock: (r.stockQty ?? 0) > 0 || !r.outOfStock,
    bestseller: meta.bestseller,
    short: meta.short,
    description,
    researchAreas,
    pairsWith: meta.pairsWith,
    copySource: useLive ? "live" : "authored",
    image: `/products/${r.slug}.webp`,
    sourceImage: r.sourceImage,
  };
});

// --- integrity checks -------------------------------------------------
const errs: string[] = [];
const slugs = new Set<string>();
for (const p of products) {
  if (slugs.has(p.slug)) errs.push(`duplicate slug ${p.slug}`);
  slugs.add(p.slug);
  if (!p.basePrice || p.basePrice <= 0) errs.push(`${p.slug}: no basePrice`);
  if (!p.short) errs.push(`${p.slug}: no short`);
  if (!p.description) errs.push(`${p.slug}: no description`);
  if (p.format !== "supply" && !p.goals.length) errs.push(`${p.slug}: no goals`);
  for (const q of p.pairsWith ?? [])
    if (!raw.some((r) => r.slug === q)) errs.push(`${p.slug}: pairsWith unknown slug ${q}`);
  // ladder must be non-increasing
  for (let i = 1; i < p.tiers.length; i++)
    if (p.tiers[i].unitPrice > p.tiers[i - 1].unitPrice)
      errs.push(`${p.slug}: tier ${i} price rises`);
}
if (errs.length) {
  console.error("INTEGRITY ERRORS:\n" + errs.join("\n"));
  process.exit(1);
}

const banner = `// AUTO-GENERATED by scripts/gen-products.ts - do not edit by hand.
// Source: upgradebiolabs.com shop pages + PDPs, scraped ${new Date().toISOString().slice(0, 10)}.
// Prices and quantity ladders are the live per-variation values, not computed.
// \`copySource: "authored"\` marks descriptions written for this build because
// the live PDP had none. Those need client review before publishing.
`;

const out = `${banner}
import type { Product } from "./types";

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export const byFormat = (f: Product["format"]) => products.filter((p) => p.format === f);

export const byGoal = (g: string) => products.filter((p) => p.goals.includes(g as never));

export const bestsellers = () => products.filter((p) => p.bestseller);

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const inStock = () => products.filter((p) => p.inStock);

/** Compounds only. Excludes supplies so BAC water never triggers a stack discount. */
export const compounds = () => products.filter((p) => p.format !== "supply");
`;

fs.writeFileSync(path.join(__dirname, "..", "src", "data", "products.ts"), out);

const authored = products.filter((p) => p.copySource === "authored");
console.log(`wrote src/data/products.ts - ${products.length} SKUs`);
console.log(`  formats:`, ["vial", "spray", "capsule", "supply"].map((f) => `${f}=${products.filter((p) => p.format === f).length}`).join(" "));
console.log(`  in stock: ${products.filter((p) => p.inStock).length} / ${products.length}`);
console.log(`  bestsellers: ${products.filter((p) => p.bestseller).length}`);
console.log(`  live copy: ${products.length - authored.length}, authored copy: ${authored.length}`);
console.log(`  with COA: ${products.filter((p) => p.coaUrl).length}`);
console.log(`  with doseMg: ${products.filter((p) => p.doseMg).length}`);
console.log(`  flat-price SKUs (no ladder chip): ${products.filter((p) => new Set(p.tiers.map((t) => t.unitPrice)).size === 1).length}`);
