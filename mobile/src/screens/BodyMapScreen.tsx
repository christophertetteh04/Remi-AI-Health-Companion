import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { CheckCircle2, Info, RotateCcw } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { GhostButton, PrimaryButton } from "../components/UI";

type BodyView = "front" | "back";
type BodyRegion = {
  id: string;
  label: string;
  view: BodyView;
  path?: string;
  ellipse?: { cx: number; cy: number; rx: number; ry: number };
};

const FRONT_REGIONS: BodyRegion[] = [
  { id: "head", label: "Head", view: "front", ellipse: { cx: 120, cy: 38, rx: 22, ry: 24 } },
  { id: "chest", label: "Chest", view: "front", path: "M84 78 C94 66 146 66 156 78 L151 126 C139 135 101 135 89 126 Z" },
  { id: "abdomen", label: "Abdomen", view: "front", path: "M90 128 C103 136 137 136 150 128 L145 181 C133 190 107 190 95 181 Z" },
  { id: "left_arm", label: "Left arm", view: "front", path: "M78 82 C63 90 54 111 50 139 L43 194 C42 205 54 208 58 197 L72 141 C76 123 82 104 91 90 Z" },
  { id: "right_arm", label: "Right arm", view: "front", path: "M162 82 C177 90 186 111 190 139 L197 194 C198 205 186 208 182 197 L168 141 C164 123 158 104 149 90 Z" },
  { id: "left_leg", label: "Left leg", view: "front", path: "M97 184 C107 190 116 190 120 184 L116 281 C115 296 98 296 96 281 L88 203 C87 195 90 188 97 184 Z" },
  { id: "right_leg", label: "Right leg", view: "front", path: "M120 184 C124 190 133 190 143 184 C150 188 153 195 152 203 L144 281 C142 296 125 296 124 281 Z" },
];

const BACK_REGIONS: BodyRegion[] = [
  { id: "head_back", label: "Back of head", view: "back", ellipse: { cx: 120, cy: 38, rx: 22, ry: 24 } },
  { id: "upper_back", label: "Upper back", view: "back", path: "M84 78 C96 67 144 67 156 78 L153 128 C139 139 101 139 87 128 Z" },
  { id: "lower_back", label: "Lower back", view: "back", path: "M88 130 C103 138 137 138 152 130 L145 181 C132 190 108 190 95 181 Z" },
  { id: "left_arm_back", label: "Left arm", view: "back", path: "M78 82 C63 90 54 111 50 139 L43 194 C42 205 54 208 58 197 L72 141 C76 123 82 104 91 90 Z" },
  { id: "right_arm_back", label: "Right arm", view: "back", path: "M162 82 C177 90 186 111 190 139 L197 194 C198 205 186 208 182 197 L168 141 C164 123 158 104 149 90 Z" },
  { id: "left_leg_back", label: "Left leg", view: "back", path: "M97 184 C107 190 116 190 120 184 L116 281 C115 296 98 296 96 281 L88 203 C87 195 90 188 97 184 Z" },
  { id: "right_leg_back", label: "Right leg", view: "back", path: "M120 184 C124 190 133 190 143 184 C150 188 153 195 152 203 L144 281 C142 296 125 296 124 281 Z" },
];

export default function BodyMapScreen({ navigation, route }: any) {
  const initial = initialRegion(route?.params?.initialLabel);
  const [view, setView] = useState<BodyView>(initial.view);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(initial.region);
  const regions = useMemo(() => (view === "front" ? FRONT_REGIONS : BACK_REGIONS), [view]);

  const confirm = () => {
    if (!selected) return;
    route.params?.onSelect?.(selected.label);
    navigation.goBack();
  };

  const switchView = (next: BodyView) => {
    setView(next);
    setSelected(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <RotateCcw size={19} color={colors.primary} />
          </View>
          <Text style={styles.eyebrow}>LOCATION ONLY</Text>
          <Text style={styles.title}>{route?.params?.title || "Confirm location"}</Text>
          <Text style={styles.subtitle}>
            {route?.params?.subtitle || "Tap the broad area on the body map. Remi saves only the location label, never how the symptom looks."}
          </Text>
        </View>

        <View style={styles.notice}>
          <Info size={16} color={colors.mint} />
          <Text style={styles.noticeText}>This is not a diagnosis or image interpretation. It only confirms where you mean.</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.toggleRow}>
            <Pressable onPress={() => switchView("front")} style={[styles.toggleBtn, view === "front" && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, view === "front" && styles.toggleTextActive]}>Front</Text>
            </Pressable>
            <Pressable onPress={() => switchView("back")} style={[styles.toggleBtn, view === "back" && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, view === "back" && styles.toggleTextActive]}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.mapFrame}>
            <Svg width="100%" height={380} viewBox="0 0 240 315">
              <BodyModel view={view} />
              {regions.map((region) => (
                <RegionShape
                  key={region.id}
                  region={region}
                  active={selected?.id === region.id}
                  onPress={() => setSelected({ id: region.id, label: region.label })}
                />
              ))}
            </Svg>
          </View>

          <View style={[styles.selectionPanel, selected && styles.selectionPanelActive]}>
            {selected ? (
              <>
                <CheckCircle2 size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectionLabel}>Selected area</Text>
                  <Text style={styles.selectionValue}>{selected.label}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.selectionEmpty}>Choose a broad body area to continue.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Confirm location" onPress={confirm} style={{ opacity: selected ? 1 : 0.45 }} />
        <View style={{ height: 10 }} />
        <GhostButton title="Cancel" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

function BodyModel({ view }: { view: BodyView }) {
  const isBack = view === "back";
  return (
    <>
      <Defs>
        <LinearGradient id="bodyDepth" x1="32" y1="30" x2="208" y2="286" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FCFDFF" />
          <Stop offset="0.36" stopColor="#EAF1F7" />
          <Stop offset="0.7" stopColor="#D8E4EE" />
          <Stop offset="1" stopColor="#B9C9D8" />
        </LinearGradient>
        <LinearGradient id="sideShade" x1="45" y1="52" x2="195" y2="254" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#D6E1EC" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#74889B" stopOpacity="0.42" />
        </LinearGradient>
        <RadialGradient id="torsoGlow" cx="118" cy="122" r="74" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.88" />
          <Stop offset="0.55" stopColor="#EDF4FA" stopOpacity="0.62" />
          <Stop offset="1" stopColor="#B4C6D7" stopOpacity="0.18" />
        </RadialGradient>
        <LinearGradient id="activeRegion" x1="82" y1="56" x2="163" y2="220" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#60A5FA" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#2563EB" stopOpacity="0.28" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="240" height="315" fill="#F7FAFD" />
      <Ellipse cx="120" cy="299" rx="62" ry="10" fill="#90A4B8" opacity="0.16" />
      <Path
        d="M120 14 C134 14 145 25 145 40 C145 51 139 60 130 65 L130 74 C145 77 158 83 169 94 C181 105 185 124 186 143 L200 252 C202 267 186 273 180 258 L164 196 L155 286 C153 304 131 306 128 287 L122 205 L118 205 L112 287 C109 306 87 304 85 286 L76 196 L60 258 C54 273 38 267 40 252 L54 143 C55 124 59 105 71 94 C82 83 95 77 110 74 L110 65 C101 60 95 51 95 40 C95 25 106 14 120 14 Z"
        fill="url(#bodyDepth)"
        stroke="#B9C7D4"
        strokeWidth={1.4}
      />
      <Path
        d="M120 14 C134 14 145 25 145 40 C145 51 139 60 130 65 L130 74 C145 77 158 83 169 94 C181 105 185 124 186 143 L200 252 C202 267 186 273 180 258 L164 196 L155 286 C153 304 131 306 128 287 L122 205 L118 205 L112 287 C109 306 87 304 85 286 L76 196 L60 258 C54 273 38 267 40 252 L54 143 C55 124 59 105 71 94 C82 83 95 77 110 74 L110 65 C101 60 95 51 95 40 C95 25 106 14 120 14 Z"
        fill="url(#torsoGlow)"
        opacity={0.9}
      />
      <Path
        d="M64 102 C55 122 52 153 48 194 L43 246 C42 258 50 263 56 254 C65 220 72 178 77 141 C80 119 86 99 96 86 C83 88 72 93 64 102 Z"
        fill="url(#sideShade)"
        opacity={0.55}
      />
      <Path
        d="M176 102 C185 122 188 153 192 194 L197 246 C198 258 190 263 184 254 C175 220 168 178 163 141 C160 119 154 99 144 86 C157 88 168 93 176 102 Z"
        fill="url(#sideShade)"
        opacity={0.48}
      />
      <Path
        d="M96 184 C107 191 116 191 120 184 L116 281 C115 296 99 297 96 281 L89 204 C88 195 91 188 96 184 Z"
        fill="#D1DFEA"
        opacity={0.42}
      />
      <Path
        d="M121 184 C125 191 134 191 144 184 C150 188 153 195 152 204 L144 281 C141 297 126 296 124 281 Z"
        fill="#B9CADA"
        opacity={0.38}
      />
      <Circle cx="112" cy="34" r="5" fill="#FFFFFF" opacity={0.62} />
      <Path d="M103 67 C111 72 128 72 137 67" stroke="#AEBECC" strokeWidth={1.15} strokeLinecap="round" fill="transparent" opacity={0.7} />

      {isBack ? (
        <G opacity={0.82}>
          <Path d="M85 82 C99 73 141 73 155 82" stroke="#9FB1C1" strokeWidth={1.4} strokeLinecap="round" fill="transparent" />
          <Path d="M90 113 C105 125 135 125 150 113" stroke="#C3D0DB" strokeWidth={1.1} strokeLinecap="round" fill="transparent" />
          <Path d="M120 76 L120 188" stroke="#9FB1C1" strokeWidth={1.5} strokeLinecap="round" fill="transparent" opacity={0.78} />
          <Path d="M101 92 C105 112 111 128 120 139 C129 128 135 112 139 92" stroke="#C3D0DB" strokeWidth={1.1} strokeLinecap="round" fill="transparent" />
          <Path d="M95 154 C107 162 133 162 145 154" stroke="#C3D0DB" strokeWidth={1.05} strokeLinecap="round" fill="transparent" />
        </G>
      ) : (
        <G opacity={0.82}>
          <Path d="M88 78 C101 68 139 68 152 78" stroke="#9FB1C1" strokeWidth={1.4} strokeLinecap="round" fill="transparent" />
          <Path d="M96 106 C105 99 114 96 120 96 C126 96 135 99 144 106" stroke="#C0CEDA" strokeWidth={1.1} strokeLinecap="round" fill="transparent" />
          <Path d="M95 129 C110 136 130 136 145 129" stroke="#B7C6D3" strokeWidth={1.15} strokeLinecap="round" fill="transparent" />
          <Path d="M120 76 L120 190" stroke="#C9D5DF" strokeWidth={1} strokeLinecap="round" fill="transparent" />
          <Path d="M103 148 C112 153 128 153 137 148" stroke="#D0DAE3" strokeWidth={1} strokeLinecap="round" fill="transparent" />
        </G>
      )}
    </>
  );
}

function RegionShape({ region, active, onPress }: { region: BodyRegion; active: boolean; onPress: () => void }) {
  const fill = active ? "url(#activeRegion)" : "rgba(255,255,255,0.015)";
  const stroke = active ? colors.primary : "rgba(82, 97, 115, 0.16)";
  const common = { fill, stroke, strokeWidth: active ? 2.2 : 1.1, onPress };
  if (region.ellipse) {
    return <Ellipse {...region.ellipse} {...common} />;
  }
  return <Path d={region.path || ""} {...common} />;
}

function initialRegion(label?: string): { view: BodyView; region: { id: string; label: string } | null } {
  if (!label) return { view: "front", region: null };
  const normalized = label.toLowerCase();
  const back = BACK_REGIONS.find((region) => region.label.toLowerCase() === normalized || region.id === normalized);
  if (back) return { view: "back", region: { id: back.id, label: back.label } };
  const front = FRONT_REGIONS.find((region) => region.label.toLowerCase() === normalized || region.id === normalized);
  if (front) return { view: "front", region: { id: front.id, label: front.label } };
  return { view: "front", region: null };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 150 },
  header: { paddingTop: 18, paddingBottom: 18 },
  iconBadge: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  notice: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.mintDim, borderRadius: 8, padding: 13, marginBottom: 14 },
  noticeText: { flex: 1, color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9 },
  mapCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  toggleRow: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 999, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  toggleText: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  toggleTextActive: { color: colors.primary },
  mapFrame: { minHeight: 388, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#F7FAFD", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  selectionPanel: { minHeight: 62, marginTop: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  selectionPanelActive: { backgroundColor: colors.primaryDim, borderColor: "rgba(37, 99, 235, 0.28)" },
  selectionLabel: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  selectionValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 18, marginTop: 1 },
  selectionEmpty: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
