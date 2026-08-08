import type { Format } from "@/data/types";

/** The three physical formats, drawn as simple geometric marks.
 *  These are product-shape glyphs, not decorative illustration: the vial,
 *  spray and capsule outlines are what make "we sell three formats" legible
 *  on a card without a word of copy. */
export default function FormatIcon({
  format,
  size = 12,
  className,
}: {
  format: Format;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (format === "spray")
    return (
      <svg {...common}>
        <path d="M7 1.6h2.6" />
        <path d="M8.3 1.6v2.2" />
        <rect x="5.4" y="3.8" width="5.4" height="2" rx="0.6" />
        <path d="M5.9 5.8h4.4a2 2 0 0 1 2 2v5a1.6 1.6 0 0 1-1.6 1.6H5.5a1.6 1.6 0 0 1-1.6-1.6v-5a2 2 0 0 1 2-2Z" />
      </svg>
    );

  if (format === "capsule")
    return (
      <svg {...common}>
        <path d="M5.6 1.8h4.8" />
        <rect x="4.6" y="3.4" width="6.8" height="2.1" rx="0.6" />
        <path d="M4.2 5.5h7.6v7.3a1.6 1.6 0 0 1-1.6 1.6H5.8a1.6 1.6 0 0 1-1.6-1.6Z" />
        <path d="M6 9h4" />
      </svg>
    );

  if (format === "supply")
    return (
      <svg {...common}>
        <path d="M5.8 1.8h4.4" />
        <path d="M6.4 1.8v2.4L4.6 12a1.6 1.6 0 0 0 1.5 2.2h3.8a1.6 1.6 0 0 0 1.5-2.2L9.6 4.2V1.8" />
        <path d="M5.4 9.4h5.2" />
      </svg>
    );

  // vial
  return (
    <svg {...common}>
      <path d="M5.4 1.8h5.2" />
      <rect x="5" y="3.2" width="6" height="2" rx="0.6" />
      <path d="M5 5.2h6v7.6a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 12.8Z" />
      <path d="M5 10.6h6" />
    </svg>
  );
}
