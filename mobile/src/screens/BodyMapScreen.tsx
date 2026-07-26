import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, ScreenHeader, GhostButton } from "../components/UI";

// A simple, real (not decorative) tappable body map. Deliberately
// abstract/simple shapes rather than a detailed illustration — swap
// in a nicer illustrated asset later (see AI-BUILD-PROMPTS.md #2),
// the region-tagging logic here will keep working the same way.
const FRONT_REGIONS = [
  { id: "head", label: "Head", cx: 100, cy: 30, r: 16 },
  { id: "chest", label: "Chest", cx: 100, cy: 80, r: 22 },
  { id: "abdomen", label: "Abdomen", cx: 100, cy: 130, r: 20 },
  { id: "left_arm", label: "Left arm", cx: 55, cy: 100, r: 14 },
  { id: "right_arm", label: "Right arm", cx: 145, cy: 100, r: 14 },
  { id: "left_leg", label: "Left leg", cx: 85, cy: 210, r: 16 },
  { id: "right_leg", label: "Right leg", cx: 115, cy: 210, r: 16 },
];

const BACK_REGIONS = [
  { id: "head_back", label: "Back of head", cx: 100, cy: 30, r: 16 },
  { id: "upper_back", label: "Upper back", cx: 100, cy: 80, r: 22 },
  { id: "lower_back", label: "Lower back", cx: 100, cy: 130, r: 20 },
  { id: "left_arm_back", label: "Left arm", cx: 55, cy: 100, r: 14 },
  { id: "right_arm_back", label: "Right arm", cx: 145, cy: 100, r: 14 },
  { id: "left_leg_back", label: "Left leg", cx: 85, cy: 210, r: 16 },
  { id: "right_leg_back", label: "Right leg", cx: 115, cy: 210, r: 16 },
];

export default function BodyMapScreen({ navigation, route }: any) {
  const [view, setView] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;

  const confirm = () => {
    if (!selected) return;
    route.params?.onSelect?.(selected.label);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Where is it?" subtitle="Tap the area — we only note the location, nothing else" />
      <View style={{ alignItems: "center" }}>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => { setView("front"); setSelected(null); }} style={[styles.toggleBtn, view === "front" && styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, view === "front" && styles.toggleTextActive]}>Front</Text>
          </Pressable>
          <Pressable onPress={() => { setView("back"); setSelected(null); }} style={[styles.toggleBtn, view === "back" && styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, view === "back" && styles.toggleTextActive]}>Back</Text>
          </Pressable>
        </View>

        <Svg width={200} height={260} viewBox="0 0 200 260">
          {/* simple body outline */}
          <Path
            d="M100 10 C112 10 122 20 122 34 C122 46 114 54 108 58 L108 70 C130 74 144 90 144 110 L144 150 L128 150 L128 190 L118 260 L108 260 L104 160 L96 160 L92 260 L82 260 L72 190 L72 150 L56 150 L56 110 C56 90 70 74 92 70 L92 58 C86 54 78 46 78 34 C78 20 88 10 100 10 Z"
            fill={colors.surfaceRaised}
            stroke={colors.hairline}
            strokeWidth={1}
          />
          {regions.map((r) => (
            <Circle
              key={r.id}
              cx={r.cx}
              cy={r.cy}
              r={r.r}
              fill={selected?.id === r.id ? "rgba(155,140,250,0.45)" : "transparent"}
              stroke={selected?.id === r.id ? colors.primary : "transparent"}
              strokeWidth={2}
              onPress={() => setSelected({ id: r.id, label: r.label })}
            />
          ))}
        </Svg>

        {selected && (
          <View style={styles.selectedPill}>
            <Text style={styles.selectedText}>{selected.label}</Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 28, marginTop: "auto", paddingBottom: 24 }}>
        <PrimaryButton title="Confirm location" onPress={confirm} style={{ opacity: selected ? 1 : 0.4 }} />
        <View style={{ height: 10 }} />
        <GhostButton title="Cancel" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginBottom: 16 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: colors.primaryDim },
  toggleText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  toggleTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  selectedPill: { backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  selectedText: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
