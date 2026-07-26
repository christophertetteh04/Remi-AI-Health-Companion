import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Activity, Check, HeartPulse, Moon, ShieldCheck, Sparkles } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { addRecentActivity } from "../services/recentActivity";
import { colors, fonts } from "../theme/tokens";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const TABS = ["Sleep", "Activity", "Weight", "Substance use"] as const;

async function post(path: string, body: any) {
  const token = await SecureStore.getItemAsync("remi_session_token");
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export default function LifestyleScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Sleep");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LIFESTYLE</Text>
          <Text style={styles.title}>Daily health habits</Text>
          <Text style={styles.subtitle}>Track sleep, movement, weight, and substance notes with quick focused check-ins.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Sparkles size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryMetric}>
            <Text style={styles.metricValue}>4</Text>
            <Text style={styles.metricLabel}>Trackers</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Build a clearer routine</Text>
            <Text style={styles.summaryText}>Small logs help Remi connect lifestyle patterns with symptoms, vitals, and medication changes.</Text>
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tabChip, tab === item && styles.tabChipActive]}>
              <TabIcon tab={item} active={tab === item} />
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === "Sleep" && <SleepForm />}
        {tab === "Activity" && <ActivityForm />}
        {tab === "Weight" && <WeightForm />}
        {tab === "Substance use" && <SubstanceForm />}
      </View>
    </ScrollView>
  );
}

function TabIcon({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const color = active ? colors.primary : colors.inkFaint;
  if (tab === "Sleep") return <Moon size={15} color={color} />;
  if (tab === "Activity") return <Activity size={15} color={color} />;
  if (tab === "Weight") return <HeartPulse size={15} color={color} />;
  return <ShieldCheck size={15} color={color} />;
}

function SleepForm() {
  const [hours, setHours] = useState("7");
  const [quality, setQuality] = useState("good");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!hours.trim()) {
      Alert.alert("Add sleep hours", "Please enter how many hours you slept.");
      return;
    }

    await post("/lifestyle/sleep", { hours: Number(hours), quality });
    await addRecentActivity({
      type: "lifestyle",
      title: "Sleep logged",
      detail: `${hours || 0} hours, ${quality} quality`,
      route: "Lifestyle",
    });
    setSaved(true);
  };

  return (
    <TrackerCard
      icon={<Moon size={17} color={colors.primary} />}
      title="Sleep check-in"
      subtitle="Log duration and quality so rest patterns are easier to review."
      saved={saved}
      savedText="Sleep entry saved."
    >
      <Input label="Hours slept" value={hours} onChangeText={setHours} placeholder="e.g. 7.5" keyboardType="decimal-pad" />
      <Text style={styles.label}>Sleep quality</Text>
      <View style={styles.choiceRow}>
        {["poor", "okay", "good"].map((item) => (
          <Pressable key={item} onPress={() => setQuality(item)} style={[styles.choiceChip, quality === item && styles.choiceChipActive]}>
            <Text style={[styles.choiceText, quality === item && styles.choiceTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton title={saved ? "Saved" : "Log sleep"} onPress={save} />
    </TrackerCard>
  );
}

function ActivityForm() {
  const [activityType, setActivityType] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!activityType.trim() || !minutes.trim()) {
      Alert.alert("Complete activity log", "Please enter the activity and number of minutes.");
      return;
    }

    await post("/lifestyle/activity", { activityType: activityType.trim(), minutes: Number(minutes) });
    await addRecentActivity({
      type: "lifestyle",
      title: "Activity logged",
      detail: `${activityType.trim()}, ${minutes} minutes`,
      route: "Lifestyle",
    });
    setSaved(true);
  };

  return (
    <TrackerCard
      icon={<Activity size={17} color={colors.primary} />}
      title="Movement log"
      subtitle="Capture intentional movement, therapy, walks, workouts, or recovery activity."
      saved={saved}
      savedText="Activity entry saved."
    >
      <Input label="Activity" value={activityType} onChangeText={setActivityType} placeholder="e.g. Walking, cycling, stretching" />
      <Input label="Duration" value={minutes} onChangeText={setMinutes} placeholder="Minutes" keyboardType="number-pad" />
      <PrimaryButton title={saved ? "Saved" : "Log activity"} onPress={save} />
    </TrackerCard>
  );
}

function WeightForm() {
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!weightKg.trim()) {
      Alert.alert("Add weight", "Please enter your current weight before saving.");
      return;
    }

    const res = await post("/lifestyle/weight", { weightKg: Number(weightKg), heightCm: heightCm ? Number(heightCm) : undefined });
    const data = await res.json();
    await addRecentActivity({
      type: "lifestyle",
      title: "Weight logged",
      detail: `${weightKg} kg`,
      route: "Lifestyle",
    });
    setBmi(data?.data?.bmi ?? null);
    setSaved(true);
  };

  return (
    <TrackerCard
      icon={<HeartPulse size={17} color={colors.primary} />}
      title="Weight trend"
      subtitle="Track changes over time and optionally calculate BMI with height."
      saved={saved}
      savedText="Weight entry saved."
    >
      <Input label="Weight" value={weightKg} onChangeText={setWeightKg} placeholder="kg" keyboardType="decimal-pad" />
      <Input label="Height" value={heightCm} onChangeText={setHeightCm} placeholder="cm, optional for BMI" keyboardType="decimal-pad" />
      <PrimaryButton title={saved ? "Saved" : "Log weight"} onPress={save} />
      {bmi ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Calculated BMI</Text>
          <Text style={styles.resultValue}>{bmi}</Text>
        </View>
      ) : null}
    </TrackerCard>
  );
}

function SubstanceForm() {
  const [substance, setSubstance] = useState("alcohol");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!note.trim()) {
      Alert.alert("Add a note", "Please add a short note before saving this entry.");
      return;
    }

    await post("/lifestyle/substance-use", { substance, note: note.trim() });
    await addRecentActivity({
      type: "lifestyle",
      title: "Lifestyle note saved",
      detail: `${substance}: ${note.trim()}`,
      route: "Lifestyle",
    });
    setSaved(true);
    setNote("");
  };

  return (
    <TrackerCard
      icon={<ShieldCheck size={17} color={colors.primary} />}
      title="Substance use note"
      subtitle="Keep private notes around alcohol, smoking, cravings, triggers, or reduction goals."
      saved={saved}
      savedText="Lifestyle note saved."
    >
      <Text style={styles.label}>Category</Text>
      <View style={styles.choiceRow}>
        {["alcohol", "smoking"].map((item) => (
          <Pressable key={item} onPress={() => setSubstance(item)} style={[styles.choiceChip, substance === item && styles.choiceChipActive]}>
            <Text style={[styles.choiceText, substance === item && styles.choiceTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Input label="Private note" value={note} onChangeText={setNote} placeholder="What would you like to remember?" multiline />
      <PrimaryButton title={saved ? "Saved" : "Log entry"} onPress={save} />
    </TrackerCard>
  );
}

function TrackerCard({
  icon,
  title,
  subtitle,
  saved,
  savedText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  saved: boolean;
  savedText: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.trackerWrap}>
      <Card style={styles.trackerCard}>
        <View style={styles.trackerHeading}>
          <View style={styles.trackerIcon}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackerTitle}>{title}</Text>
            <Text style={styles.trackerSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {children}
      </Card>
      {saved ? (
        <View style={styles.savedBanner}>
          <Check size={15} color={colors.mint} />
          <Text style={styles.savedText}>{savedText}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType}
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
  content: { paddingHorizontal: 28, gap: 14 },
  summaryCard: { flexDirection: "row", alignItems: "center", padding: 16 },
  summaryMetric: { width: 62, alignItems: "center" },
  metricValue: { color: colors.primary, fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  metricLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 46, backgroundColor: colors.hairline, marginHorizontal: 14 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  summaryText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  tabRow: { gap: 8, paddingBottom: 2 },
  tabChip: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.surface, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14 },
  tabChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12 },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  trackerWrap: { gap: 12 },
  trackerCard: { padding: 16 },
  trackerHeading: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  trackerIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  trackerTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  trackerSubtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  inputMultiline: { minHeight: 84, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  choiceChip: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 8 },
  choiceChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  choiceText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12, textTransform: "capitalize" },
  choiceTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  resultCard: { marginTop: 12, backgroundColor: colors.primaryDim, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultLabel: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  resultValue: { color: colors.primary, fontFamily: fonts.display, fontSize: 22 },
});
