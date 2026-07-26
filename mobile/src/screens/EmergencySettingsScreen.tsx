import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, ScreenHeader } from "../components/UI";

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
    setSaving(true);
    // Local save happens first and is what actually matters for the
    // "works without a connection in a real emergency" requirement.
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(info));

    // Best-effort cloud sync so a new device can restore this later
    // (see AI-BUILD-PROMPTS.md #10, account recovery) — failure here
    // must never block the local save above.
    try {
      const token = await SecureStore.getItemAsync("remi_session_token");
      await fetch(`${API_BASE_URL}/emergency-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const field = (key: keyof EmergencyInfo, label: string, placeholder: string) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={info[key]}
        onChangeText={(v) => setInfo({ ...info, [key]: v })}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
      />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Emergency info" subtitle="Shown on the Safety tab, even without unlocking the app" />
      <View style={{ paddingHorizontal: 28 }}>
        {field("bloodType", "Blood type", "e.g. O+")}
        {field("allergies", "Allergies", "e.g. Penicillin")}
        {field("medications", "Current medications", "e.g. Amlodipine, Metformin")}
        {field("contactName", "Emergency contact name", "e.g. Kojo")}
        {field("contactPhone", "Emergency contact phone", "+233 ...")}
        <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14 },
});
