// Product profile copy supplied by the client ("Product Listing Copy -
// Peptide Catalog (Revised)"). Shown on vial product pages in place of the
// old "Research Areas" section. Keyed by product slug; a vial with no entry
// here simply shows no profile section.

export interface ProfileTable {
  /** Section label above the table, e.g. "Molecular Profile". */
  title: string;
  /** Optional one-line lead-in shown between the title and the table. */
  note?: string;
  /** Column headings, e.g. ["Specification", "Value"]. */
  head: [string, string];
  rows: [string, string][];
}

export interface ProductProfile {
  /** Intro paragraph(s) or subtitle shown above the tables. */
  intro?: string[];
  /** Small label chips. */
  tags?: string[];
  tables: ProfileTable[];
}

export const PROFILES: Record<string, ProductProfile> = {
  "aod-9604": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Modified peptide fragment"],
          ["CAS Number", "221231-10-3"],
          ["Origin", "hGH fragment 177-191"],
          ["Molecular Formula", "C78H123N23O23S2"],
          ["Molecular Weight", "~1,815 g/mol"],
          ["Amino Acids", "16 (15 hGH residues + N-terminal tyrosine)"],
          ["Sequence", "Tyr-hGH(177-191)"],
          ["Modification", "Tyrosine addition at N-terminus"],
        ],
      },
    ],
  },
  "ara-290": {
    intro: ["An 11-residue synthetic peptide modeled on the helix-B surface of erythropoietin. It selectively engages the innate repair receptor (a heterodimer of the EPO receptor and the beta-common receptor, CD131) without activating the classical EPO receptor homodimer, so it carries no erythropoietic activity."],
    tags: ["EPO-Derived Peptide", "Non-Erythropoietic"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "EPO-derived tissue-protective peptide"],
          ["CAS Number", "1208243-50-8"],
          ["Molecular Weight", "~1,257 g/mol"],
          ["Amino Acids", "11 (linear)"],
          ["Sequence", "pGlu-Glu-Gln-Leu-Glu-Arg-Ala-Leu-Asn-Ser-Ser"],
          ["Receptor", "Innate repair receptor (EPOR/βcR)"],
        ],
      },
    ],
  },
  "bpc-157": {
    intro: ["Body Protection Compound-157"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic pentadecapeptide"],
          ["CAS Number", "137525-51-0"],
          ["Molecular Formula", "C62H98N16O22"],
          ["Molecular Weight", "1,419.5 g/mol"],
          ["Amino Acids", "15"],
          ["Sequence", "GEPPPGKPADDAGLV"],
          ["Origin", "Human gastric juice"],
        ],
      },
    ],
  },
  "cagrilintide": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Long-acting acylated amylin analog"],
          ["CAS Number", "1415456-99-3"],
          ["Molecular Formula", "C194H312N54O59S2"],
          ["Molecular Weight", "4,409 g/mol"],
          ["Amino Acids", "37 (modified amylin sequence)"],
          ["Modification", "C18 fatty diacid acylation"],
        ],
      },
    ],
  },
  "cartalax-injectable": {
    intro: ["A synthetic tripeptide bioregulator with the sequence Ala-Glu-Asp (AED), one of the Khavinson family of ultra-short peptides developed at the St. Petersburg Institute of Bioregulation and Gerontology. It is assigned to cartilage and connective tissue; the AED motif corresponds to a sequence found in the alpha-1 chain of type XI collagen, a structural component of cartilage. Like other short peptide bioregulators, it is proposed to act at the level of gene expression."],
    tags: ["Short Peptide Bioregulator", "Cartilage / Connective Tissue Research"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Short peptide bioregulator (tripeptide)"],
          ["PubChem CID", "87815447"],
          ["Molecular Formula", "C12H19N3O8"],
          ["Molecular Weight", "333.29 g/mol"],
          ["Amino Acids", "3 (Ala-Glu-Asp)"],
          ["Sequence", "Alanyl-Glutamyl-Aspartic acid (AED)"],
          ["Related Peptide", "Shares the AED motif with Epithalon (AEDG)"],
        ],
      },
    ],
  },
  "dsip": {
    intro: ["Naturally occurring nonapeptide first isolated from rabbit brain in 1977."],
    tags: ["Nonapeptide", "Endogenous"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic nonapeptide"],
          ["CAS Number", "62568-57-4"],
          ["Molecular Formula", "C35H48N10O15"],
          ["Molecular Weight", "848.8 g/mol"],
          ["Amino Acids", "9 residues"],
          ["Sequence", "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu"],
        ],
      },
    ],
  },
  "epithalon": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic tetrapeptide"],
          ["CAS Number", "307297-39-8"],
          ["Molecular Formula", "C14H22N4O9"],
          ["Molecular Weight", "390.35 g/mol"],
          ["Amino Acids", "4 (tetrapeptide)"],
          ["Sequence", "Ala-Glu-Asp-Gly (AEDG)"],
        ],
      },
    ],
  },
  "ghk-cu": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Copper-peptide complex"],
          ["CAS Number", "89030-95-5"],
          ["Molecular Formula", "C14H22CuN6O4"],
          ["Molecular Weight", "340.38 g/mol (free peptide)"],
          ["Molecular Weight (Cu)", "401.91 g/mol (with copper)"],
          ["Amino Acids", "3 (tripeptide)"],
          ["Sequence", "Gly-His-Lys"],
        ],
      },
    ],
  },
  "tz-2": {
    intro: ["A 39-residue synthetic linear peptide that acts as a dual agonist at both the GIP and GLP-1 receptors. A C20 fatty diacid chain at Lys-20 drives albumin binding for an extended circulating half-life in research models."],
    tags: ["Dual-Incretin Analog", "Albumin-Bound"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Dual GIP/GLP-1 receptor agonist"],
          ["CAS Number", "2023788-19-2"],
          ["Molecular Formula", "C225H348N48O68"],
          ["Molecular Weight", "4,813.45 g/mol"],
          ["Amino Acids", "39"],
          ["Modification", "C20 fatty diacid at Lys-20"],
        ],
      },
    ],
  },
  "rt-3": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic peptide"],
          ["CAS Number", "2381089-83-2"],
          ["Molecular Weight", "4,731 g/mol"],
          ["Amino Acids", "39"],
          ["Fatty Acid Chain", "C20 diacid"],
        ],
      },
    ],
  },
  "glutathione": {
    intro: ["Endogenous antioxidant tripeptide."],
    tags: ["Endogenous", "Antioxidant"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Tripeptide (γ-Glu-Cys-Gly)"],
          ["CAS Number", "70-18-8"],
          ["Molecular Formula", "C10H17N3O6S"],
          ["Molecular Weight", "307.32 g/mol"],
          ["Sequence", "γ-L-Glutamyl-L-cysteinyl-glycine"],
          ["Active Moiety", "Cysteine thiol (-SH) group"],
        ],
      },
      {
        title: "Biological Functions: Key Enzyme Systems",
        note: "Essential cofactor for multiple enzyme families.",
        head: ["Enzyme System", "Function"],
        rows: [
          ["Glutathione Peroxidase", "Peroxide detoxification"],
          ["Glutathione S-Transferase", "Phase II conjugation"],
          ["Glutathione Reductase", "GSSG → GSH recycling"],
          ["Glyoxalase System", "Methylglyoxal detox"],
        ],
      },
    ],
  },
  "igf-1-lr3": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic IGF-1 analog"],
          ["CAS Number", "143045-27-6"],
          ["Molecular Formula", "C400H625N111O115S9"],
          ["Molecular Weight", "9,117.60 g/mol"],
          ["Amino Acids", "83"],
          ["Sequence", "MFPAMPLSSL FVNGPRTLCG..."],
        ],
      },
      {
        title: "Structural Modifications: How It Differs from Native IGF-1",
        head: ["Feature", "Detail"],
        rows: [
          ["N-terminal extension", "+13 amino acids (MFPAMPLSSLFVN)"],
          ["Position 3 substitution", "Glu → Arg"],
          ["Total length", "83 vs 70 amino acids"],
          ["IGFBP affinity", "Markedly reduced"],
          ["IGF-1R affinity", "Retained"],
        ],
      },
    ],
  },
  "ipamorelin": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic pentapeptide"],
          ["CAS Number", "170851-70-4"],
          ["Molecular Formula", "C38H49N9O5"],
          ["Molecular Weight", "711.85 g/mol"],
          ["Amino Acids", "5"],
          ["Sequence", "Aib-His-D-2-Nal-D-Phe-Lys-NH2"],
        ],
      },
    ],
  },
  "kisspeptin-10": {
    intro: ["The 10-residue C-terminal active fragment of the KISS1 gene product. It is an agonist of the KISS1R receptor (GPR54), which sits upstream of GnRH neurons in the hypothalamic-pituitary-gonadal axis."],
    tags: ["Neuropeptide", "KISS1R / GPR54"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Neuropeptide (KISS1R agonist)"],
          ["CAS Number", "374675-21-5"],
          ["Molecular Formula", "C63H83N17O14"],
          ["Molecular Weight", "1,302.4 g/mol"],
          ["Amino Acids", "10 (amidated)"],
          ["Sequence", "Tyr-Asn-Trp-Asn-Ser-Phe-Gly-Leu-Arg-Phe-NH2"],
        ],
      },
    ],
  },
  "kpv": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic tripeptide"],
          ["CAS Number", "67727-97-3"],
          ["Molecular Formula", "C16H30N4O4"],
          ["Molecular Weight", "342.43 g/mol"],
          ["Amino Acids", "3"],
          ["Sequence", "Lys-Pro-Val (KPV)"],
          ["Origin", "α-MSH residues 11-13"],
          ["Mechanism", "PepT1-mediated uptake"],
        ],
      },
      {
        title: "Parent Compound: Relationship to α-MSH",
        head: ["Feature", "Detail"],
        rows: [
          ["Parent peptide", "α-Melanocyte-Stimulating Hormone"],
          ["α-MSH length", "13 amino acids"],
          ["KPV position", "C-terminal (11-13)"],
          ["Activity retained", "Anti-inflammatory effects"],
          ["MCR binding", "NOT required for activity"],
        ],
      },
    ],
  },
  "ll-37": {
    intro: ["A 37-residue cationic, amphipathic alpha-helical peptide released by proteolytic cleavage from the C-terminus of the 18-kDa human cathelicidin protein hCAP-18. It is the only cathelicidin-derived antimicrobial peptide found in humans and is expressed by neutrophils and epithelial cells. The name comes from its two N-terminal leucines and its length (37 residues)."],
    tags: ["Host-Defense Peptide", "Immune / Wound Research"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Cationic host-defense (antimicrobial) peptide"],
          ["CAS Number", "154947-66-7"],
          ["Molecular Formula", "C205H340N60O53"],
          ["Molecular Weight", "~4,493 g/mol"],
          ["Amino Acids", "37"],
          ["Sequence", "LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES"],
          ["Parent Protein", "hCAP-18 (human cathelicidin, CAMP gene)"],
        ],
      },
    ],
  },
  "mt-ii": {
    intro: ["Synthetic cyclic heptapeptide analog of α-MSH."],
    tags: ["Cyclic Peptide", "α-MSH Analog"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["CAS Number", "121062-08-6"],
          ["Molecular Formula", "C50H69N15O9"],
          ["Molecular Weight", "1,024.18 g/mol"],
          ["Amino Acids", "7 residues"],
          ["Sequence", "Ac-Nle-c[Asp-His-D-Phe-Arg-Trp-Lys]-NH2"],
          ["Structure", "Cyclic lactam"],
        ],
      },
      {
        title: "Receptor Binding: Melanocortin Receptor Affinity",
        note: "Non-selective melanocortin receptor agonist.",
        head: ["Receptor", "Affinity"],
        rows: [
          ["MC1R", "High affinity (pigmentation)"],
          ["MC3R", "Moderate (metabolism)"],
          ["MC4R", "High affinity (sexual function)"],
          ["MC5R", "Moderate (exocrine)"],
        ],
      },
    ],
  },
  "mots-c": {
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Mitochondrial-derived peptide"],
          ["CAS Number", "1627580-64-6"],
          ["Molecular Formula", "C101H152N28O22S2"],
          ["Molecular Weight", "2,174.6 g/mol"],
          ["Amino Acids", "16"],
          ["Sequence", "MRWQEMGYIFYPRKLR"],
          ["Encoded In", "12S rRNA (mtDNA)"],
        ],
      },
    ],
  },
  "nad": {
    intro: ["Essential dinucleotide coenzyme."],
    tags: ["Coenzyme", "Endogenous"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Dinucleotide coenzyme"],
          ["CAS Number", "53-84-9"],
          ["Molecular Formula", "C21H27N7O14P2"],
          ["Molecular Weight", "663.43 g/mol"],
          ["Components", "Nicotinamide + Adenine + Ribose + Phosphate"],
        ],
      },
      {
        title: "Biological Targets: Enzyme Interactions",
        note: "Essential cofactor for multiple enzyme families.",
        head: ["Enzyme Family", "Description"],
        rows: [
          ["Sirtuins", "SIRT1-7 deacetylases"],
          ["PARPs", "DNA repair enzymes"],
          ["CD38/CD157", "NAD+ glycohydrolases"],
          ["Oxidoreductases", "500+ enzymes"],
        ],
      },
    ],
  },
  "pinealon": {
    intro: ["A synthetic tripeptide bioregulator with the sequence Glu-Asp-Arg (EDR), one of the Khavinson family of ultra-short peptides. Its small size and amphiphilic charge profile are described as letting it penetrate the cytoplasm and cell nucleus, where it is proposed to regulate gene expression and the synthesis of neuroprotective proteins. It is investigated as a cell-penetrating peptide, with research interest in neuroprotection against oxidative and hypoxic stress."],
    tags: ["Short Peptide Bioregulator", "Neuro Research"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Short peptide bioregulator (tripeptide)"],
          ["CAS Number", "175175-23-2"],
          ["Molecular Formula", "C15H26N6O8"],
          ["Molecular Weight", "418.40 g/mol"],
          ["Amino Acids", "3 (Glu-Asp-Arg)"],
          ["Sequence", "Glutamyl-Aspartyl-Arginine (EDR)"],
        ],
      },
    ],
  },
  "pt-141": {
    intro: ["Cyclic heptapeptide analog of alpha-MSH, active metabolite of Melanotan II."],
    tags: ["Cyclic Peptide", "FDA Approved"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Cyclic heptapeptide"],
          ["CAS Number", "189691-06-3"],
          ["Molecular Formula", "C50H68N14O10"],
          ["Molecular Weight", "1,025.2 g/mol"],
          ["Amino Acids", "7 residues"],
          ["Sequence", "Ac-Nle-c[Asp-His-D-Phe-Arg-Trp-Lys]-OH"],
        ],
      },
    ],
  },
  "semax": {
    intro: ["Synthetic heptapeptide analog of ACTH (4-10) with C-terminal Pro-Gly-Pro extension for enhanced stability."],
    tags: ["Heptapeptide", "ACTH Analog"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic heptapeptide"],
          ["CAS Number", "80714-61-0"],
          ["Molecular Formula", "C37H51N9O10S"],
          ["Molecular Weight", "813.9 g/mol"],
          ["Amino Acids", "7 residues"],
          ["Sequence", "Met-Glu-His-Phe-Pro-Gly-Pro"],
        ],
      },
    ],
  },
  "sermorelin": {
    intro: ["An amidated 29-residue peptide corresponding to the N-terminal active fragment of human growth hormone-releasing hormone (GHRH). It binds the GHRH receptor on anterior-pituitary somatotrophs, acting as a secretagogue rather than supplying exogenous growth hormone."],
    tags: ["GHRH Analog", "Secretagogue"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "GHRH analog (secretagogue)"],
          ["CAS Number", "86168-78-7"],
          ["Molecular Formula", "C149H246N44O42S"],
          ["Molecular Weight", "3,357.9 g/mol"],
          ["Amino Acids", "29 (amidated)"],
          ["Sequence", "Tyr-Ala-Asp-Ala-Ile-Phe-Thr-Asn-Ser-Tyr-Arg-Lys-Val-Leu-Gly-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Met-Ser-Arg-NH2"],
        ],
      },
    ],
  },
  "ss-31": {
    intro: ["A synthetic aromatic-cationic tetrapeptide, also known as elamipretide, from the Szeto-Schiller (SS) family of mitochondria-targeting peptides. Its alternating basic and aromatic residues let it cross cell membranes and concentrate in the inner mitochondrial membrane, where it binds cardiolipin."],
    tags: ["Mitochondria-Targeted Peptide", "Cardiolipin-Binding"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Aromatic-cationic tetrapeptide"],
          ["Other Names", "Elamipretide, MTP-131, Bendavia"],
          ["CAS Number", "736992-21-5"],
          ["Molecular Formula", "C32H49N9O5"],
          ["Molecular Weight", "639.79 g/mol"],
          ["Amino Acids", "4"],
          ["Sequence", "D-Arg-Dmt-Lys-Phe-NH2 (Dmt = 2,6-dimethyl-L-tyrosine)"],
          ["Target", "Cardiolipin (inner mitochondrial membrane)"],
        ],
      },
    ],
  },
  "tb-500": {
    intro: ["Thymosin Beta-4 (Fragment)"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Endogenous peptide/synthetic analog"],
          ["CAS Number", "77591-33-4"],
          ["Molecular Weight", "4,963 g/mol"],
          ["Amino Acids", "43"],
          ["Active Region", "Ac-SDKP (N-terminal)"],
          ["Key Sequence", "17LKKTET22 (actin binding)"],
          ["Origin", "Thymus, platelets"],
        ],
      },
    ],
  },
  "thymosin-alpha-1": {
    intro: ["Synthetic acetylated polypeptide identical to human thymosin alpha-1."],
    tags: ["Thymic Peptide", "Immune Modulator"],
    tables: [
      {
        title: "Molecular Profile",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic acetylated polypeptide"],
          ["CAS Number", "62304-98-7"],
          ["Molecular Formula", "C129H215N33O55"],
          ["Molecular Weight", "3,108.3 g/mol"],
          ["Amino Acids", "28"],
          ["Sequence", "Ac-SDAAVDTSSEITTKDLKEKKEVVEEAEN"],
        ],
      },
    ],
  },
  "wolverine-blendbpc-157-tb-500": {
    tables: [
      {
        title: "BPC-157 Profile: Body Protection Compound-157",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic pentadecapeptide"],
          ["CAS Number", "137525-51-0"],
          ["Molecular Weight", "1,419.5 g/mol"],
          ["Amino Acids", "15"],
          ["Sequence", "GEPPPGKPADDAGLV"],
          ["Origin", "Human gastric juice"],
        ],
      },
      {
        title: "TB-500 Profile: Thymosin Beta-4 (Fragment)",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Synthetic/endogenous peptide"],
          ["CAS Number", "77591-33-4"],
          ["Molecular Weight", "4,963 g/mol"],
          ["Amino Acids", "43"],
          ["Active Region", "17LKKTET22 (actin binding)"],
          ["Origin", "Thymus, platelets"],
        ],
      },
    ],
  },
  "cjc-1295-no-dac-ipamorelin-blend": {
    tables: [
      {
        title: "CJC-1295 (No DAC): GHRH Analog Component",
        head: ["Specification", "Value"],
        rows: [
          ["Other Names", "Mod GRF 1-29, Modified GRF"],
          ["Type", "GHRH analog"],
          ["CAS Number", "863288-34-0"],
          ["Molecular Formula", "C152H252N44O42"],
          ["Molecular Weight", "3,367.97 g/mol"],
          ["Amino Acids", "29"],
          ["Mechanism", "GHRH receptor agonist"],
          ["Half-life (No DAC)", "30 min - 2 hours"],
        ],
      },
      {
        title: "Ipamorelin: Selective GHRP Component",
        head: ["Specification", "Value"],
        rows: [
          ["Type", "Growth hormone secretagogue"],
          ["CAS Number", "170851-70-4"],
          ["Molecular Formula", "C38H49N9O5"],
          ["Molecular Weight", "711.85 g/mol"],
          ["Amino Acids", "5 (pentapeptide)"],
          ["Sequence", "Aib-His-D-2-Nal-D-Phe-Lys-NH2"],
          ["Mechanism", "Ghrelin receptor (GHSR-1a) agonist"],
          ["Selectivity", "No cortisol/prolactin elevation"],
        ],
      },
    ],
  },
  "glow-blendbpc-157-tb-500-ghk-cu": {
    tables: [
      {
        title: "What Is In GLOW?",
        head: ["Component", "Profile"],
        rows: [
          ["BPC-157", "15 amino acids, 1,419.5 g/mol"],
          ["TB-500", "43 amino acids, 4,963 g/mol"],
          ["GHK-Cu", "3 amino acids + Cu²⁺, 401.91 g/mol"],
          ["Total peptides", "3 distinct compounds"],
          ["Pairing", "Commonly researched together"],
        ],
      },
    ],
  },
  "klow-blendbpc-157-tb-500-kpv-ghk-cu": {
    tables: [
      {
        title: "What Is In KLOW?",
        head: ["Component", "Profile"],
        rows: [
          ["BPC-157", "15 amino acids, 1,419.5 g/mol"],
          ["TB-500", "43 amino acids, 4,963 g/mol"],
          ["GHK-Cu", "3 amino acids + Cu²⁺, 401.91 g/mol"],
          ["KPV", "3 amino acids (Lys-Pro-Val), 342.43 g/mol"],
          ["Total peptides", "4 distinct compounds"],
          ["Pairing", "Commonly researched together"],
        ],
      },
      {
        title: "KPV Structure: Alpha-MSH C-Terminal Fragment",
        head: ["Specification", "Value"],
        rows: [
          ["CAS Number", "67727-97-3"],
          ["Molecular Formula", "C16H30N4O4"],
          ["Molecular Weight", "342.43 g/mol"],
          ["Sequence", "Lys-Pro-Val (KPV)"],
          ["Origin", "α-MSH residues 11-13"],
          ["Mechanism", "PepT1-mediated uptake"],
        ],
      },
    ],
  },
};
