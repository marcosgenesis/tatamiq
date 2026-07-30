// Pure graduation/belt-progression logic. No React, no fetching.
// Tested in belt-progress.test.ts.

export type BeltKey =
  | "branca"
  | "cinza-branca"
  | "cinza"
  | "cinza-preta"
  | "amarela-branca"
  | "amarela"
  | "amarela-preta"
  | "laranja-branca"
  | "laranja"
  | "laranja-preta"
  | "verde-branca"
  | "verde"
  | "verde-preta"
  | "azul"
  | "roxa"
  | "marrom"
  | "preta";

export type BeltInfo = {
  key: BeltKey;
  /** Display name, e.g. "Roxa". */
  name: string;
  /** Bar color for BeltVisual fallback rendering. */
  color: string;
  /** Whether the belt color needs a border to read on a light surface. */
  needsBorder: boolean;
  /** Rank-bar treatment used by the fallback belt visual. */
  tipStyle?: "color" | "white" | "black";
};

export const BELT_ORDER: BeltInfo[] = [
  { key: "branca", name: "Branca", color: "#d4d4d4", needsBorder: true },
  { key: "azul", name: "Azul", color: "#1d4ed8", needsBorder: false },
  { key: "roxa", name: "Roxa", color: "#5b21b6", needsBorder: false },
  { key: "marrom", name: "Marrom", color: "#6b4423", needsBorder: false },
  { key: "preta", name: "Preta", color: "#111111", needsBorder: false },
];

const CHILD_BELT_ORDER: BeltInfo[] = [
  { key: "branca", name: "Branca", color: "#d4d4d4", needsBorder: true },
  {
    key: "cinza-branca",
    name: "Cinza / Branca",
    color: "#6b7280",
    needsBorder: false,
    tipStyle: "white",
  },
  { key: "cinza", name: "Cinza", color: "#6b7280", needsBorder: false, tipStyle: "color" },
  {
    key: "cinza-preta",
    name: "Cinza / Preta",
    color: "#6b7280",
    needsBorder: false,
    tipStyle: "black",
  },
  {
    key: "amarela-branca",
    name: "Amarela / Branca",
    color: "#eab308",
    needsBorder: false,
    tipStyle: "white",
  },
  { key: "amarela", name: "Amarela", color: "#eab308", needsBorder: false, tipStyle: "color" },
  {
    key: "amarela-preta",
    name: "Amarela / Preta",
    color: "#eab308",
    needsBorder: false,
    tipStyle: "black",
  },
  {
    key: "laranja-branca",
    name: "Laranja / Branca",
    color: "#ea580c",
    needsBorder: false,
    tipStyle: "white",
  },
  { key: "laranja", name: "Laranja", color: "#ea580c", needsBorder: false, tipStyle: "color" },
  {
    key: "laranja-preta",
    name: "Laranja / Preta",
    color: "#ea580c",
    needsBorder: false,
    tipStyle: "black",
  },
  {
    key: "verde-branca",
    name: "Verde / Branca",
    color: "#16a34a",
    needsBorder: false,
    tipStyle: "white",
  },
  { key: "verde", name: "Verde", color: "#16a34a", needsBorder: false, tipStyle: "color" },
  {
    key: "verde-preta",
    name: "Verde / Preta",
    color: "#16a34a",
    needsBorder: false,
    tipStyle: "black",
  },
];

const BELT_INFO = [...BELT_ORDER, ...CHILD_BELT_ORDER.slice(1)];

export const MAX_DEGREE = 4;
export const EXPECTED_MONTHS_PER_DEGREE = 6;

export type GraduationInput = {
  currentBelt: { name: string; position?: number; path?: string | null } | null;
  currentDegree: number;
  promotions: Array<{
    id?: string;
    beltName: string;
    degree: number;
    promotedAt: string;
    notes?: string | null;
  }>;
};

export type BeltProgress = {
  beltKey: BeltKey;
  beltName: string;
  beltColor: string;
  degree: number;
  /** Index into BELT_ORDER (0 = branca). */
  journeyIndex: number;
  isWhiteBelt: boolean;
  atMaxDegree: boolean;
  /** Short label for the next milestone, e.g. "3º grau" or "Faixa Marrom". */
  nextLabel: string;
  /** Sentence for the hero, e.g. "Faltam ~4 meses para o 3º grau". */
  nextCopy: string;
  /** 0..1 progress toward the next degree. */
  progress: number;
  /** Whole months remaining toward the next degree (0 when ready / at max). */
  monthsRemaining: number;
  /** Human span on the current belt, e.g. "há 2 anos", or null when unknown. */
  timeOnBelt: string | null;
};

export function beltKeyFromName(name: string | null | undefined): BeltKey {
  const n = (name ?? "").toLowerCase();
  if (n.includes("cinza") && n.includes("branca")) return "cinza-branca";
  if (n.includes("cinza") && n.includes("preta")) return "cinza-preta";
  if (n.includes("amarel") && n.includes("branca")) return "amarela-branca";
  if (n.includes("amarel") && n.includes("preta")) return "amarela-preta";
  if (n.includes("laranja") && n.includes("branca")) return "laranja-branca";
  if (n.includes("laranja") && n.includes("preta")) return "laranja-preta";
  if (n.includes("verde") && n.includes("branca")) return "verde-branca";
  if (n.includes("verde") && n.includes("preta")) return "verde-preta";
  if (n.includes("cinza") || n.includes("gray") || n.includes("grey")) return "cinza";
  if (n.includes("amarel") || n.includes("yellow")) return "amarela";
  if (n.includes("laranja") || n.includes("orange")) return "laranja";
  if (n.includes("verde") || n.includes("green")) return "verde";
  if (n.includes("azul")) return "azul";
  if (n.includes("rox")) return "roxa";
  if (n.includes("marrom") || n.includes("brown")) return "marrom";
  if (n.includes("pret") || n.includes("black")) return "preta";
  return "branca";
}

export function beltInfo(key: BeltKey): BeltInfo {
  return BELT_INFO.find((b) => b.key === key) ?? (BELT_ORDER[0] as BeltInfo);
}

export function beltOrderFor(path: string | null | undefined): readonly BeltInfo[] {
  return path === "child" ? CHILD_BELT_ORDER : BELT_ORDER;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Fractional months between two ISO dates (uses 30.44-day average month). */
export function monthsBetween(fromIso: string, toIso: string | Date): number {
  const from = new Date(fromIso).getTime();
  const to = typeof toIso === "string" ? new Date(toIso).getTime() : toIso.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, (to - from) / (1000 * 60 * 60 * 24 * 30.44));
}

/** "há 2 anos" / "há 4 meses" / "hoje" from an ISO date. */
export function timeSpanLabel(fromIso: string, now: string | Date = new Date()): string {
  const months = Math.floor(monthsBetween(fromIso, now));
  if (months < 1) return "hoje";
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export function beltProgress(
  graduation: GraduationInput,
  now: string | Date = new Date(),
): BeltProgress {
  const beltKey = beltKeyFromName(graduation.currentBelt?.name);
  const info = beltInfo(beltKey);
  const beltOrder = beltOrderFor(graduation.currentBelt?.path);
  const degree = Math.max(0, graduation.currentDegree ?? 0);
  const journeyIndex = beltOrder.findIndex((b) => b.key === beltKey);
  const promotions = graduation.promotions ?? [];
  const isWhiteBelt = beltKey === "branca" && degree === 0;

  const beltPromotions = promotions
    .filter((p) => beltKeyFromName(p.beltName) === beltKey)
    .slice()
    .sort((a, b) => +new Date(a.promotedAt) - +new Date(b.promotedAt));
  const awardDate = beltPromotions[0]?.promotedAt ?? null;

  const lastPromotion = promotions
    .slice()
    .sort((a, b) => +new Date(b.promotedAt) - +new Date(a.promotedAt))[0];
  const referenceDate = lastPromotion?.promotedAt ?? awardDate;

  const atMaxDegree = degree >= MAX_DEGREE;
  const monthsSince = referenceDate ? monthsBetween(referenceDate, now) : 0;
  const progress = atMaxDegree ? 1 : clamp01(monthsSince / EXPECTED_MONTHS_PER_DEGREE);
  const monthsRemaining = atMaxDegree
    ? 0
    : Math.max(0, Math.ceil(EXPECTED_MONTHS_PER_DEGREE - monthsSince));

  const nextBelt = beltOrder[journeyIndex + 1];
  let nextLabel: string;
  let nextCopy: string;
  if (atMaxDegree) {
    nextLabel = nextBelt ? `Faixa ${nextBelt.name}` : "Faixa Preta";
    nextCopy = nextBelt ? `Pronto para a faixa ${nextBelt.name}` : "Topo da jornada";
  } else {
    const nextDegree = degree + 1;
    nextLabel = `${nextDegree}º grau`;
    nextCopy =
      monthsRemaining <= 0
        ? `Pronto para o ${nextDegree}º grau`
        : `Faltam ~${monthsRemaining} ${monthsRemaining === 1 ? "mês" : "meses"} para o ${nextDegree}º grau`;
  }

  return {
    beltKey,
    beltName: info.name,
    beltColor: info.color,
    degree,
    journeyIndex,
    isWhiteBelt,
    atMaxDegree,
    nextLabel,
    nextCopy,
    progress,
    monthsRemaining,
    timeOnBelt: awardDate ? timeSpanLabel(awardDate, now) : null,
  };
}
