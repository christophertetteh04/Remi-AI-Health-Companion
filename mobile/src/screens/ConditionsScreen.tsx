import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { ScreenHeader } from "../components/UI";
import { Check } from "lucide-react-native";
import { scheduleHydrationReminder, cancelHydrationReminder } from "../services/notifications";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

const LABELS: Record<string, string> = {
  sickle_cell: "Sickle cell disease",
  hiv_art_adherence: "HIV / ART adherence",
  asthma: "Asthma / respiratory",
  kidney: "Kidney function tracking",
  cholesterol: "Cholesterol tracking",
  thyroid: "Thyroid tracking",
};

export default function ConditionsScreen({ navigation }: any) {
  const [available, setAvailable] = useState<string[]>([]);
  const [tracked, setTracked] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("remi_session_token");
      const res = await fetch(`${API_BASE_URL}/conditions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAvailable(data.available || []);
      setTracked(data.tracked || []);
    })();
  }, []);

  const toggle = async (condition: string) => {
    const enabling = !tracked.includes(condition);
    setTracked(enabling ? [...tracked, condition] : tracked.filter((c) => c !== condition));

    const token = await SecureStore.getItemAsync("remi_session_token");
    await fetch(`${API_BASE_URL}/conditions/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ condition, enabled: enabling }),
    });

    // Sickle cell tracking includes hydration reminders — schedule
    // or cancel the local notification alongside the opt-in.
    if (condition === "sickle_cell") {
      if (enabling) await scheduleHydrationReminder();
      else await cancelHydrationReminder();
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Conditions" subtitle="Opt into tracking a condition — nothing is enabled by default" />
      <View style={{ paddingHorizontal: 28, gap: 10 }}>
        {available.map((c) => {
          const on = tracked.includes(c);
          return (
            <Pressable key={c} onPress={() => toggle(c)} style={styles.row}>
              <View style={[styles.checkbox, on && { backgroundColor: colors.primary }]}>
                {on && <Check size={12} color={colors.bg} />}
              </View>
              <Text style={styles.label}>{LABELS[c] || c}</Text>
              {c === "sickle_cell" && on && (
                <Pressable onPress={() => navigation.navigate("PainCrisisLog")} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Log a pain crisis</Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 12 },
  label: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5 },
  linkBtn: { backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  linkText: { color: colors.primary, fontFamily: fonts.body, fontSize: 10.5 },
});
