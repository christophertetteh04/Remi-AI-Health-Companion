import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts, spacing } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import { ArrowLeft, HeartPulse, Phone, Pill, ShieldCheck, Siren, Sparkles } from "lucide-react-native";
import { authHeader } from "../services/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const STORAGE_KEY = "remi_emergency_info";

type EmergencyInfo = { bloodType: string; allergies: string; medications: string; contactName: string; contactPhone: string };

const EMPTY: EmergencyInfo = { bloodType: "", allergies: "", medications: "", contactName: "", contactPhone: "" };

export default function EmergencySettingsScreen({ navigation }: any) {
  const [info, setInfo] = useState<EmergencyInfo>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((cached) => {
      if (cached) setInfo(JSON.parse(cached));
    });
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    // Local save happens first and is what actually matters for the
    // "works without a connection in a real emergency" requirement.
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(info));

    // Best-effort cloud sync so a new device can restore this later
    // (see AI-BUILD-PROMPTS.md #10, account recovery) — failure here
    // must never block the local save above.
    try {
      await fetch(`${API_BASE_URL}/emergency-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(info),
      });
    } catch {
      // Offline or backend unreachable — local copy is already saved,
      // which is what matters most for this screen.
    } finally {
      setSaving(false);
      navigation.goBack();
    }
  };

  const updateInfo = (key: keyof EmergencyInfo, value: string) => {
    setInfo((current) => ({ ...current, [key]: value }));
  };

  const completedCount = Object.values(info).filter((value) => value.trim()).length;

  const field = (key: keyof EmergencyInfo, label: string, placeholder: string, multiline = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={info[key]}
        onChangeText={(v) => updateInfo(key, v)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        style={[styles.input, multiline && styles.multilineInput]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={key === "contactPhone" ? "phone-pad" : "default"}
        autoCapitalize={key === "contactPhone" ? "none" : "sentences"}
      />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.statusPill}>
          <ShieldCheck size={13} color={colors.primary} />
          <Text style={styles.statusText}>{completedCount}/5 added</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>EMERGENCY PROFILE</Text>
          <Text style={styles.title}>Critical info, ready fast.</Text>
          <Text style={styles.subtitle}>These details appear on the Safety tab and are saved on this device for quick access.</Text>
        </View>
        <View style={styles.heroIcon}>
          <Siren size={27} color={colors.urgent} />
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressIcon}>
            <Sparkles size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Profile readiness</Text>
            <Text style={styles.progressText}>Add the fields most helpful to responders or a trusted contact.</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(completedCount / 5) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <HeartPulse size={17} color={colors.urgent} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Medical essentials</Text>
            <Text style={styles.sectionSub}>Details that matter immediately</Text>
          </View>
        </View>
        {field("bloodType", "Blood type", "e.g. O+")}
        {field("allergies", "Allergies", "e.g. Penicillin, peanuts, latex", true)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primaryDim }]}>
            <Pill size={17} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Current medications</Text>
            <Text style={styles.sectionSub}>Keep names and doses concise</Text>
          </View>
        </View>
        {field("medications", "Medication list", "e.g. Amlodipine 5 mg, Metformin 500 mg", true)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.mintDim }]}>
            <Phone size={17} color={colors.mint} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Emergency contact</Text>
            <Text style={styles.sectionSub}>Someone who can be reached quickly</Text>
          </View>
        </View>
        {field("contactName", "Contact name", "e.g. Kojo Mensah")}
        {field("contactPhone", "Contact phone", "+233 ...")}
      </View>

      <View style={styles.privacyNote}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.privacyText}>Saved locally first, so your emergency details remain available even when the network is unreliable.</Text>
      </View>

      <View style={styles.saveBar}>
        <PrimaryButton title={saving ? "Saving..." : "Save emergency info"} onPress={save} style={{ opacity: saving ? 0.62 : 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statusText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroCopy: { flex: 1, paddingRight: 16 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 8 },
  progressCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12 },
  progressHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  progressIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  progressTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  progressText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceRaised, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.primary },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  sectionSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  field: { marginBottom: 12 },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 15, paddingVertical: 13, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 48 },
  multilineInput: { minHeight: 86, lineHeight: 20 },
  privacyNote: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  privacyText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
  saveBar: { backgroundColor: colors.bg, paddingTop: 4 },
});
