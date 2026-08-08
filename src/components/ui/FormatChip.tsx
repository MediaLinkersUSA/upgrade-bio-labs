import type { Format } from "@/data/types";
import FormatIcon from "./FormatIcon";

const STYLE: Record<Format, { bg: string; fg: string; label: string }> = {
  vial: { bg: "var(--color-vial-wash)", fg: "var(--color-vial)", label: "vial" },
  spray: { bg: "var(--color-spray-wash)", fg: "var(--color-teal-dark)", label: "spray" },
  capsule: { bg: "var(--color-capsule-wash)", fg: "var(--color-capsule-text)", label: "capsule" },
  supply: { bg: "var(--color-supply-wash)", fg: "#4B7185", label: "supply" },
};

export default function FormatChip({
  format,
  label,
}: {
  format: Format;
  label?: string;
}) {
  const s = STYLE[format];
  return (
    <span
      className="label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
      style={{ background: s.bg, color: s.fg }}
    >
      <FormatIcon format={format} size={12} />
      {label ?? s.label}
    </span>
  );
}
