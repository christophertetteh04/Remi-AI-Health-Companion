// Design tokens — dark, premium, minimal, softly playful.
// Mirrors the approved prototype direction, expressed as real
// React Native style values (no Tailwind in RN by default).

export const colors = {
  bg: "#17151E",
  surface: "#1F1D29",
  surfaceRaised: "#272531",
  hairline: "#332F42",
  ink: "#F3F1F7",
  inkSoft: "#9C97AE",
  inkFaint: "#6E6A80",
  primary: "#9B8CFA",
  primaryDim: "#2B2740",
  peach: "#FFB577",
  peachDim: "#3A2E28",
  mint: "#7FE0B4",
  mintDim: "#1E332C",
  urgent: "#FF6B5B",
  urgentDim: "#3A2129",
};

export const urgencyColor = (level: "normal" | "monitor" | "urgent") =>
  ({ normal: colors.mint, monitor: colors.peach, urgent: colors.urgent }[level]);

export const radius = { sm: 12, md: 18, lg: 22, xl: 28, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };

// Font families — loaded via @expo-google-fonts packages in App.tsx.
// Instrument Serif (display), Plus Jakarta Sans (body), JetBrains Mono (data)
export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  mono: "JetBrainsMono_400Regular",
};
