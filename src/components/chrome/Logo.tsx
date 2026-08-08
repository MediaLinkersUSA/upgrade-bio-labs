export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-[7px] leading-none">
      <span
        className="font-display text-[21px] font-bold leading-none tracking-[-0.045em]"
        style={{ color: light ? "#fff" : "var(--color-navy)" }}
      >
        UPGRADE
      </span>
      {/* Tight tracking and a small optical gap, so the lockup reads as one
          mark rather than two separate words. */}
      <span
        className="text-[11.5px] font-bold uppercase leading-none tracking-[0.04em]"
        style={{ color: light ? "rgba(255,255,255,0.75)" : "var(--color-teal-dark)" }}
      >
        Bio&nbsp;Labs
      </span>
    </span>
  );
}
