import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, spacing, fonts, urgencyColor } from "../theme/tokens";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, style }: { title: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={[styles.primaryBtn, style]}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghostBtn}>
      <Text style={styles.ghostBtnText}>{title}</Text>
    </Pressable>
  );
}

export function UrgencyDot({ level }: { level: "normal" | "monitor" | "urgent" }) {
  return <View style={[styles.dot, { backgroundColor: urgencyColor(level) }]} />;
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: 18 }}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: colors.bg,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
  },
  ghostBtn: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  h1: { color: colors.ink, fontFamily: fonts.display, fontSize: 26, letterSpacing: 0 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, marginTop: 4 },
});
