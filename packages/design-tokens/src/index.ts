export const tatamiqTokens = {
  colors: {
    canvas: "#fbf8f3",
    surface: "#ffffff",
    ink: "#241f1a",
    mutedInk: "#6e6258",
    border: "#e6ded5",
    brand: "#b15300",
    brandStrong: "#8c3f00",
    brandSoft: "#fff0df",
    success: "#18794e",
    warning: "#9a6700",
    danger: "#b42318",
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
  },
  spacing: {
    page: 24,
    section: 32,
  },
} as const;

export type TatamiqTokens = typeof tatamiqTokens;
