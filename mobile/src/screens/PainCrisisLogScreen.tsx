import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AlertTriangle, Check, Droplets, MapPin, ShieldAlert } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { addRecentActivity } from "../services/recentActivity";
import { colors, fonts } from "../theme/tokens";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function PainCrisisLogScreen({ navigation }: any) {
  const [severity, setSeverity] = useState(5);
  const [location, setLocation] = useState("");
  const [triggerNote, setTriggerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [urgentMessage, setUrgentMessage] = useState<string | null>(null);

  const save = async () => {
    if (!location.trim()) {
      Alert.alert("Add pain location", "Please enter where the pain is before saving this crisis log.");
      return;
    }

    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const res = await fetch(`${API_BASE_URL}/pain-crises`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ severity, location: location.trim(), triggerNote: triggerNote.trim() }),
      });
      const data = await res.json();
      await addRecentActivity({
        type: "lifestyle",
        title: "Pain crisis logged",
        detail: `Severity ${severity}/10, ${location.trim()}`,
        route: "Conditions",
      });

      if (data.tier === "urgent") {
        setUrgentMessage(data.urgentMessage);
      } else {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (urgentMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.urgentDim }}>
        <ScrollView contentContainerStyle={styles.urgentContainer}>
          <View style={styles.urgentIcon}>
            <ShieldAlert size={30} color={colors.urgent} />
          </View>
          <Text style={styles.urgentTitle}>Urgent care recommended</Text>
          <Text style={styles.urgentText}>{urgentMessage}</Text>
          <Card style={styles.urgentCard}>
            <AlertTriangle size={17} color={colors.urgent} />
            <Text style={styles.urgentCardText}>If symptoms feel severe, breathing is difficult, or pain is not improving, contact emergency services or your care team now.</Text>
          </Card>
          <PrimaryButton title="Back to conditions" onPress={() => navigation.goBack()} />
        </ScrollView>

      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 126 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PAIN CRISIS</Text>
            <Text style={styles.title}>Log a pain episode</Text>
            <Text style={styles.subtitle}>Capture severity, location, and possible triggers so patterns are easier to discuss with your care team.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Droplets size={24} color={colors.primary} />
          </View>
        </View>

        <View style={styles.content}>
          <Card style={styles.noticeCard}>
            <AlertTriangle size={17} color={colors.peach} />
            <Text style={styles.noticeText}>Seek urgent care for chest pain, trouble breathing, weakness on one side, fever, severe headache, or pain that feels dangerous.</Text>
          </Card>

          <Card style={styles.formCard}>
            <SectionTitle icon={<ShieldAlert size={16} color={colors.primary} />} title="Pain severity" />
            <View style={styles.severityHeader}>
              <Text style={styles.label}>Severity today</Text>
              <View style={styles.severityBadge}>
                <Text style={styles.severityBadgeText}>{severity}/10</Text>
              </View>
            </View>
            <View style={styles.severityGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <Pressable key={value} onPress={() => setSeverity(value)} style={[styles.severityDot, severity === value && styles.severityDotActive]}>
                  <Text style={[styles.severityDotText, severity === value && styles.severityDotTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <SectionTitle icon={<MapPin size={16} color={colors.primary} />} title="Episode details" />
            <Input label="Pain location" value={location} onChangeText={setLocation} placeholder="e.g. lower back, chest, left leg" />
            <Input label="Possible trigger" value={triggerNote} onChangeText={setTriggerNote} placeholder="Dehydration, cold, stress, infection, exercise..." multiline />
          </Card>

          {saved ? (
            <View style={styles.savedBanner}>
              <Check size={15} color={colors.mint} />
              <Text style={styles.savedText}>Pain crisis log saved.</Text>
            </View>
          ) : null}

          <PrimaryButton title={saving ? "Saving..." : "Save pain crisis log"} onPress={save} />
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back to conditions</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, padding: 14 },
  noticeText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  severityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  severityBadge: { backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  severityBadgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  severityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  severityDot: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  severityDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  severityDotText: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 12 },
  severityDotTextActive: { color: colors.bg },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5 },
  inputMultiline: { minHeight: 86, textAlignVertical: "top" },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
  urgentContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 36 },
  urgentIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  urgentTitle: { color: colors.urgent, fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  urgentText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 10 },
  urgentCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, marginTop: 18, marginBottom: 18 },
  urgentCardText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginLeft: 10, flex: 1 },
});
