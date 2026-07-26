import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, Linking, Pressable, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card } from "../components/UI";
import { AlertTriangle, ChevronRight, FilePenLine, Lock, PhoneCall, ShieldAlert, ShieldCheck } from "lucide-react-native";

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

  const emergencyRows = [
    ["Blood type", info?.bloodType || "Not added"],
    ["Allergies", info?.allergies || "Not added"],
    ["Medications", info?.medications || "Not added"],
    ["Contact", info?.contactName ? `${info.contactName} - ${info.contactPhone}` : "Not added"],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SAFETY</Text>
          <Text style={styles.title}>Emergency ready</Text>
          <Text style={styles.subtitle}>Keep critical details and help options easy to reach.</Text>
        </View>
        <View style={styles.headerIcon}>
          <ShieldAlert size={24} color={colors.urgent} />
        </View>
      </View>

      <Pressable onPress={() => Linking.openURL("tel:112")} style={styles.sosCard}>
        <View style={styles.sosIcon}>
          <PhoneCall size={26} color={colors.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sosLabel}>Emergency assistance</Text>
          <Text style={styles.sosTitle}>Call 112</Text>
          <Text style={styles.sosSub}>Ghana national emergency line</Text>
        </View>
        <ChevronRight size={18} color={colors.urgent} />
      </Pressable>

      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View>
            <Text style={styles.sectionLabel}>EMERGENCY PROFILE</Text>
            <Text style={styles.infoTitle}>{info ? "Critical details saved" : "Add critical details"}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("EmergencySettings")} style={styles.editButton}>
            <FilePenLine size={14} color={colors.primary} />
            <Text style={styles.editText}>{info ? "Edit" : "Add"}</Text>
          </Pressable>
        </View>

        <View style={styles.profileGrid}>
          {emergencyRows.map(([label, value]) => (
            <View key={label} style={styles.profileTile}>
              <Text style={styles.profileLabel}>{label}</Text>
              <Text style={[styles.profileValue, value === "Not added" && styles.profileMissing]} numberOfLines={2}>{value}</Text>
            </View>
          ))}
        </View>

        {!info && (
          <Pressable onPress={() => navigation.navigate("EmergencySettings")} style={styles.setupPrompt}>
            <AlertTriangle size={15} color={colors.peach} />
            <Text style={styles.setupText}>Add these details so they are ready when they matter.</Text>
          </Pressable>
        )}
      </Card>

      <View style={styles.actionList}>
        <Pressable onPress={() => navigation.navigate("EmergencySettings")} style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: colors.primaryDim }]}>
            <FilePenLine size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Manage emergency info</Text>
            <Text style={styles.cardSub}>Blood type, allergies, medications, and contacts</Text>
          </View>
          <ChevronRight size={16} color={colors.inkFaint} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Settings")} style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: colors.mintDim }]}>
            <Lock size={17} color={colors.mint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Privacy & data controls</Text>
            <Text style={styles.cardSub}>View, export, or delete your health data</Text>
          </View>
          <ChevronRight size={16} color={colors.inkFaint} />
        </Pressable>
      </View>

      <View style={styles.footerNote}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.footerText}>Emergency info is stored securely on this device for quick access.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  eyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 250 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center" },
  sosCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.urgentDim,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F8B4B4",
    padding: 16,
    marginBottom: 12,
  },
  sosIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.urgent, alignItems: "center", justifyContent: "center", marginRight: 14 },
  sosLabel: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  sosTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 25, marginTop: 2 },
  sosSub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  infoCard: { padding: 16, marginBottom: 12 },
  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 4 },
  infoTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  editButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  editText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  profileTile: { width: "48%", minHeight: 70, backgroundColor: colors.bg, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 11 },
  profileLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5 },
  profileValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12.5, lineHeight: 17, marginTop: 6 },
  profileMissing: { color: colors.inkFaint, fontFamily: fonts.body },
  setupPrompt: { flexDirection: "row", alignItems: "center", backgroundColor: colors.peachDim, borderRadius: 10, padding: 12, marginTop: 12 },
  setupText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
  actionList: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", minHeight: 72, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  cardSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  footerNote: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginTop: 12 },
  footerText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
