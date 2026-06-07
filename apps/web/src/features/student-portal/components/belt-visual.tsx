import { cn } from "@/lib/utils";
import { type BeltKey, beltInfo } from "../lib/belt-progress";

type Size = "swatch" | "inline" | "hero";

const DIMS: Record<
  Size,
  {
    h: number;
    tab: number;
    sw: number;
    sh: number;
    r: number;
    pad: number;
    gap: number;
    w?: number;
  }
> = {
  swatch: { h: 13, tab: 12, sw: 1.5, sh: 7, r: 3, pad: 5, gap: 2, w: 42 },
  inline: { h: 30, tab: 56, sw: 3, sh: 15, r: 6, pad: 16, gap: 5 },
  hero: { h: 42, tab: 76, sw: 4, sh: 23, r: 6, pad: 22, gap: 6 },
};

/**
 * Jiu-jitsu belt: colored bar + black tip + N white degree stripes.
 * Prefers the academy-provided belt image when present, else renders the bar.
 */
export function BeltVisual({
  beltKey,
  degrees = 0,
  size = "inline",
  imagePath,
  name,
  className,
}: {
  beltKey: BeltKey;
  degrees?: number;
  size?: Size;
  imagePath?: string | null | undefined;
  name?: string;
  className?: string;
}) {
  const info = beltInfo(beltKey);
  const label = `Faixa ${name ?? info.name}, ${degrees} ${degrees === 1 ? "grau" : "graus"}`;

  if (imagePath) {
    return (
      <img
        src={imagePath}
        alt={label}
        style={{ height: DIMS[size].h }}
        className={cn("w-auto rounded-md", className)}
      />
    );
  }

  const d = DIMS[size];
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-end overflow-hidden",
        info.needsBorder && "ring-1 ring-inset ring-black/15",
        size !== "swatch" && "w-full",
        className,
      )}
      style={{
        height: d.h,
        borderRadius: d.r,
        backgroundColor: info.color,
        paddingRight: d.pad,
        width: d.w,
      }}
    >
      <div
        className="flex h-full items-center justify-center bg-neutral-900"
        style={{ width: d.tab, gap: d.gap }}
      >
        {Array.from({ length: Math.min(degrees, 6) }).map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative stripes
            key={i}
            className="rounded-[1px] bg-white"
            style={{ width: d.sw, height: d.sh }}
          />
        ))}
      </div>
    </div>
  );
}
