import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AlertTriangle, ArrowLeft, Database, LockKeyhole, ShieldAlert, Trash2 } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { deleteAccountData } from "../services/api";
import { supabase } from "../services/supabaseClient";

const LOCAL_KEYS = [
  "remi_session_token",
  "remi_onboarded",
  "remi_profile",
  "remi_emergency_info",
  "remi_recent_activity",
  "remi_reminder_map",
  "remi_vitals_reminder_id",
  "remi_hydration_reminder_ids",
  "remi_dental_vision_reminder_id",
  "remi_lock_enabled",
];

export default function DeleteAccountDataScreen({ navigation }: any) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = confirmation.trim() === "DELETE";

  const clearLocalState = async () => {
    await Promise.all(LOCAL_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
  };

  const confirmDelete = () => {
    if (!confirmed || deleting) return;
    Alert.alert(
      "Delete Remi data?",
      "This will remove your Remi account data from the backend and sign you out on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete data",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccountData("DELETE");
              await supabase?.auth.signOut();
              await clearLocalState();
              navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
            } catch {
              Alert.alert("Deletion failed", "Remi could not delete your account data right now. Please try again when your connection is stable.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <Trash2 size={13} color={colors.urgent} />
          <Text style={styles.badgeText}>Delete</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ShieldAlert size={28} color={colors.urgent} />
        </View>
        <Text style={styles.eyebrow}>ACCOUNT DATA</Text>
        <Text style={styles.title}>Delete account data</Text>
        <Text style={styles.subtitle}>Permanently remove your Remi account data and sign out from this device.</Text>
      </View>

      <View style={styles.warningCard}>
        <AlertTriangle size={18} color={colors.urgent} />
        <Text style={styles.warningText}>This action cannot be undone. Export your health data first if you need a copy for your records or clinician.</Text>
      </View>

      <View style={styles.detailsCard}>
        <DataRow title="Deleted from Remi" detail="Health logs, medications, vitals, labs, condition tracking, uploaded private media, and account profile data owned by you." />
        <DataRow title="Cleared on this device" detail="Session, onboarding state, emergency cache, reminders map, profile cache, and local activity history." />
        <DataRow title="Not medical advice" detail="Deleting Remi data does not delete official medical records held by hospitals, clinics, labs, pharmacies, or clinicians." />
      </View>

      <View style={styles.confirmCard}>
        <Text style={styles.label}>Type DELETE to confirm</Text>
        <TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" placeholder="DELETE" placeholderTextColor={colors.inkFaint} style={styles.input} />
        <Pressable onPress={confirmDelete} disabled={!confirmed || deleting} style={[styles.deleteButton, (!confirmed || deleting) && styles.deleteButtonDisabled]}>
          <Trash2 size={17} color={colors.bg} />
          <Text style={styles.deleteText}>{deleting ? "Deleting..." : "Delete account data"}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <LockKeyhole size={15} color={colors.primary} />
        <Text style={styles.footerText}>Remi verifies your signed-in session before deleting backend data.</Text>
      </View>
    </ScrollView>
  );
}

function DataRow({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataIcon}>
        <Database size={15} color={colors.urgent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dataTitle}>{title}</Text>
        <Text style={styles.dataText}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.urgentDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  warningCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.urgentDim, borderRadius: 12, padding: 14, marginBottom: 12 },
  warningText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 12.5, lineHeight: 18, marginLeft: 10, flex: 1 },
  detailsCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden", marginBottom: 12 },
  dataRow: { flexDirection: "row", padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  dataIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dataTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  dataText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  confirmCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.mono, fontSize: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  deleteButton: { minHeight: 50, borderRadius: 999, backgroundColor: colors.urgent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteButtonDisabled: { opacity: 0.42 },
  deleteText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 12, padding: 14, marginTop: 12 },
  footerText: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
