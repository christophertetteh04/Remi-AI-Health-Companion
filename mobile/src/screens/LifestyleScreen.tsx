import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, ScreenHeader } from "../components/UI";
import { addRecentActivity } from "../services/recentActivity";

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
  const [tab, setTab] = useState<typeof TABS[number]>("Sleep");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Lifestyle" subtitle="Sleep, activity, weight, and substance use" />
      <View style={{ paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 8, marginBottom: 16 }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabChip, tab === t && { backgroundColor: colors.primaryDim }]}>
              <Text style={{ color: tab === t ? colors.primary : colors.inkSoft, fontFamily: fonts.body, fontSize: 12 }}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: 8 }}>
          {tab === "Sleep" && <SleepForm />}
          {tab === "Activity" && <ActivityForm />}
          {tab === "Weight" && <WeightForm />}
          {tab === "Substance use" && <SubstanceForm />}
        </View>
      </View>
    </ScrollView>
  );
}

function SleepForm() {
  const [hours, setHours] = useState("7");
  const [quality, setQuality] = useState("good");
  const [saved, setSaved] = useState(false);
  const save = async () => {
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
    <View>
      <TextInput value={hours} onChangeText={setHours} keyboardType="number-pad" placeholder="Hours slept" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <View style={styles.chipRow}>
        {["poor", "okay", "good"].map((q) => (
          <Pressable key={q} onPress={() => setQuality(q)} style={[styles.chip, quality === q && { backgroundColor: colors.primaryDim }]}>
            <Text style={{ color: quality === q ? colors.primary : colors.inkSoft, fontFamily: fonts.body, fontSize: 12 }}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton title={saved ? "Saved" : "Log sleep"} onPress={save} />
    </View>
  );
}

function ActivityForm() {
  const [activityType, setActivityType] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await post("/lifestyle/activity", { activityType, minutes: Number(minutes) });
    await addRecentActivity({
      type: "lifestyle",
      title: "Activity logged",
      detail: `${activityType || "Activity"}${minutes ? `, ${minutes} minutes` : ""}`,
      route: "Lifestyle",
    });
    setSaved(true);
  };
  return (
    <View>
      <TextInput value={activityType} onChangeText={setActivityType} placeholder="Activity (e.g. walking)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="Minutes" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <PrimaryButton title={saved ? "Saved" : "Log activity"} onPress={save} />
    </View>
  );
}

function WeightForm() {
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const save = async () => {
    const res = await post("/lifestyle/weight", { weightKg: Number(weightKg), heightCm: heightCm ? Number(heightCm) : undefined });
    const data = await res.json();
    await addRecentActivity({
      type: "lifestyle",
      title: "Weight logged",
      detail: weightKg ? `${weightKg} kg` : "Weight entry saved",
      route: "Lifestyle",
    });
    setBmi(data?.data?.bmi ?? null);
  };
  return (
    <View>
      <TextInput value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="Weight (kg)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <TextInput value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="Height (cm, optional — enables BMI)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <PrimaryButton title="Log weight" onPress={save} />
      {bmi && (
        <Card style={{ marginTop: 14 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 13 }}>BMI: {bmi}</Text>
        </Card>
      )}
    </View>
  );
}

function SubstanceForm() {
  const [substance, setSubstance] = useState("alcohol");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await post("/lifestyle/substance-use", { substance, note });
    await addRecentActivity({
      type: "lifestyle",
      title: "Lifestyle note saved",
      detail: `${substance}${note ? `: ${note}` : ""}`,
      route: "Lifestyle",
    });
    setSaved(true);
    setNote("");
  };
  return (
    <View>
      <View style={styles.chipRow}>
        {["alcohol", "smoking"].map((s) => (
          <Pressable key={s} onPress={() => setSubstance(s)} style={[styles.chip, substance === s && { backgroundColor: colors.primaryDim }]}>
            <Text style={{ color: substance === s ? colors.primary : colors.inkSoft, fontFamily: fonts.body, fontSize: 12 }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="Anything you'd like to note (optional)" placeholderTextColor={colors.inkFaint} style={styles.input} multiline />
      <PrimaryButton title={saved ? "Saved" : "Log entry"} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabChip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, marginBottom: 10 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
