import React, { useEffect, useState } from "react";
import { View, Text, Linking, Pressable, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { Phone, Lock, Pencil } from "lucide-react-native";

const STORAGE_KEY = "remi_emergency_info";

export default function EmergencyScreen({ navigation }: any) {
  const [info, setInfo] = useState<{ bloodType: string; allergies: string; medications: string; contactName: string; contactPhone: string } | null>(null);

  // Reads from local secure storage — NOT a network call — so this
  // screen works even with no connection, which is the point of it.
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      SecureStore.getItemAsync(STORAGE_KEY).then((cached) => {
        setInfo(cached ? JSON.parse(cached) : null);
      });
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Safety" subtitle="Accessible even without unlocking the app" />
      <View style={{ paddingHorizontal: 28, gap: 12 }}>
        <Card style={{ backgroundColor: colors.urgentDim }}>
          <View style={styles.emergencyHeader}>
            <Text style={styles.emergencyLabel}>IN CASE OF EMERGENCY</Text>
            <Pressable onPress={() => navigation.navigate("EmergencySettings")}>
              <Pencil size={14} color={colors.urgent} />
            </Pressable>
          </View>
          {info ? (
            [
              ["Blood type", info.bloodType || "—"],
              ["Allergies", info.allergies || "—"],
              ["Current medications", info.medications || "—"],
              ["Emergency contact", info.contactName ? `${info.contactName} — ${info.contactPhone}` : "—"],
            ].map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowKey}>{k}</Text>
                <Text style={styles.rowVal}>{v}</Text>
              </View>
            ))
          ) : (
            <Pressable onPress={() => navigation.navigate("EmergencySettings")}>
              <Text style={styles.emptyText}>Tap to add your emergency info</Text>
            </Pressable>
          )}
        </Card>
        <Pressable onPress={() => Linking.openURL("tel:112")}>
          <Card style={{ flexDirection: "row", alignItems: "center" }}>
            <Phone size={17} color={colors.urgent} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Call 112</Text>
              <Text style={styles.cardSub}>Ghana national emergency line</Text>
            </View>
          </Card>
        </Pressable>
        <Card style={{ flexDirection: "row", alignItems: "center" }}>
          <Lock size={17} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Privacy & data controls</Text>
            <Text style={styles.cardSub}>View, export, or delete your health data</Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  emergencyLabel: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rowKey: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12 },
  rowVal: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12 },
  emptyText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5 },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  cardSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});
