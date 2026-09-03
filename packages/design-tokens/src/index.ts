export const appDoSenseiTokens = {
  colors: {
    canvas: "#F3F1EE",
    surface: "#FFFFFF",
    ink: "#1C1A17",
    mutedInk: "#8B857E",
    border: "#ECE7E1",
    brand: "#F4531C",
    brandStrong: "#D23A0A",
    brandSoft: "#FDE9DF",
    success: "#1E9E5A",
    successSoft: "#E4F5EC",
    warning: "#D9871F",
    danger: "#E5484D",
    dangerSoft: "#FDE7E7",
    dark: "#0E0C0B",
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

export type AppDoSenseiTokens = typeof appDoSenseiTokens;
