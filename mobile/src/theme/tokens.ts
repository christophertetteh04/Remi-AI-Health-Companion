// Design tokens for a clean, modern clinical interface.
// Kept centralized so screens stay consistent as the app grows.

export const colors = {
  bg: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceRaised: "#EEF4F8",
  hairline: "#D8E1EA",
  ink: "#102033",
  inkSoft: "#526173",
  inkFaint: "#8A98A8",
  primary: "#2563EB",
  primaryDim: "#E8F0FE",
  peach: "#B45309",
  peachDim: "#FFF4E6",
  mint: "#047857",
  mintDim: "#E6F6EF",
  urgent: "#DC2626",
  urgentDim: "#FEECEC",
};

export const urgencyColor = (level: "normal" | "monitor" | "urgent") =>
  ({ normal: colors.mint, monitor: colors.peach, urgent: colors.urgent }[level]);

export const radius = { sm: 6, md: 8, lg: 8, xl: 12, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };

// Font families — loaded via @expo-google-fonts packages in App.tsx.
// Plus Jakarta Sans keeps headings and body text polished and readable.
export const fonts = {
  display: "PlusJakartaSans_600SemiBold",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  mono: "JetBrainsMono_400Regular",
};
