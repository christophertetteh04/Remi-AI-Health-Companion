import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, ScreenHeader } from "../components/UI";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function PainCrisisLogScreen({ navigation }: any) {
  const [severity, setSeverity] = useState(5);
  const [location, setLocation] = useState("");
  const [triggerNote, setTriggerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [urgentMessage, setUrgentMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const res = await fetch(`${API_BASE_URL}/pain-crises`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ severity, location, triggerNote }),
      });
      const data = await res.json();
      if (data.tier === "urgent") {
        setUrgentMessage(data.urgentMessage);
      } else {
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  };

  if (urgentMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.urgentDim, paddingHorizontal: 28, paddingTop: 60, justifyContent: "space-between", paddingBottom: 36 }}>
        <Text style={styles.urgentText}>{urgentMessage}</Text>
        <PrimaryButton title="Okay" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60 }}>
      <ScreenHeader title="Log a pain crisis" />
      <Text style={styles.label}>Severity (1–10)</Text>
      <View style={styles.severityRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable key={n} onPress={() => setSeverity(n)} style={[styles.severityDot, severity === n && { backgroundColor: colors.primary }]}>
            <Text style={{ color: severity === n ? colors.bg : colors.inkFaint, fontFamily: fonts.mono, fontSize: 11 }}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={location} onChangeText={setLocation} placeholder="Where is the pain?" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <TextInput value={triggerNote} onChangeText={setTriggerNote} placeholder="Anything that might have triggered it? (optional)" placeholderTextColor={colors.inkFaint} style={styles.input} multiline />
      <View style={{ marginTop: 16 }}>
        <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 10 },
  severityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  severityDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, marginBottom: 10 },
  urgentText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 20 },
});
