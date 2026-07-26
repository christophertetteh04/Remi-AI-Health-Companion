import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";
import { AlertTriangle } from "lucide-react-native";
import { scheduleMedicationReminder } from "../services/notifications";
import { addRecentActivity } from "../services/recentActivity";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// This screen is the safety mechanism described in the flow doc:
// OCR output is ALWAYS shown as an editable draft here — nothing is
// saved to medications until the user explicitly confirms each field.
export default function PrescriptionScanScreen({ navigation, route }: any) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [draft, setDraft] = useState<{ drugName: string; dose: string; frequency: string; note: string | null } | null>(null);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [awaitingAvailability, setAwaitingAvailability] = useState(false);

  useEffect(() => {
    if (route?.params?.source === "camera") pickImage(true);
    if (route?.params?.source === "library") pickImage(false);
  }, [route?.params?.source]);

  const pickImage = async (fromCamera: boolean) => {
    const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await picker({ base64: true, quality: 0.7 });
    if (result.canceled) return;
    setImageUri(result.assets[0].uri);
    await scan(result.assets[0].base64!);
  };

  const scan = async (imageBase64: string) => {
    setScanning(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const res = await fetch(`${API_BASE_URL}/prescriptions/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      setDraft({ drugName: data.drugName, dose: data.dose, frequency: data.frequency, note: data.note });
    } catch {
      setDraft({ drugName: "", dose: "", frequency: "", note: "Couldn't reach the scanner — please enter details manually." });
    } finally {
      setScanning(false);
    }
  };

  const confirmAndSave = async () => {
    if (!draft) return;
    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const [hourStr, minuteStr] = reminderTime.split(":");
      const hour = Number(hourStr) || 8;
      const minute = Number(minuteStr) || 0;
      const res = await fetch(`${API_BASE_URL}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: draft.drugName, dose: draft.dose, frequency: draft.frequency, hour, minute, source: "ocr" }),
      });
      const saved = await res.json();
      if (saved?.id) {
        await scheduleMedicationReminder(saved.id, hour, minute);
      }
      await addRecentActivity({
        type: "medication",
        title: "Prescription added",
        detail: draft.drugName ? `${draft.drugName} ${draft.dose}`.trim() : "Medication draft confirmed",
        route: "Meds",
      });
      // Medication availability check — reminders are already
      // scheduled above, but we still ask, since a "no" here is what
      // should route the user to nearby pharmacies rather than
      // leaving them to sort it out on their own.
      setAwaitingAvailability(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      {awaitingAvailability ? (
        <View style={{ paddingHorizontal: 28, paddingTop: 60 }}>
          <ScreenHeader title="One more thing" subtitle="Have you gotten the medications yet?" />
          <View style={{ gap: 10 }}>
            <PrimaryButton title="Yes, I have them" onPress={() => navigation.goBack()} />
            <GhostButton title="Not yet — help me find a pharmacy" onPress={() => navigation.replace("PharmacyLookup")} />
          </View>
        </View>
      ) : (
        <>
      <ScreenHeader title="Scan prescription" subtitle="We'll show you exactly what we read — nothing saves automatically" />
      <View style={{ paddingHorizontal: 28 }}>
        {!imageUri && (
          <View style={{ gap: 10 }}>
            <PrimaryButton title="Take a photo" onPress={() => pickImage(true)} />
            <GhostButton title="Choose from library" onPress={() => pickImage(false)} />
          </View>
        )}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

        {scanning && <Text style={styles.loading}>Reading prescription…</Text>}

        {draft && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>Confirm each field before saving</Text>

            {draft.note && (
              <View style={styles.warning}>
                <AlertTriangle size={15} color={colors.peach} />
                <Text style={styles.warningText}>{draft.note}</Text>
              </View>
            )}

            <TextInput
              value={draft.drugName}
              onChangeText={(v) => setDraft({ ...draft, drugName: v })}
              placeholder="Medication name"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />
            <TextInput
              value={draft.dose}
              onChangeText={(v) => setDraft({ ...draft, dose: v })}
              placeholder="Dose (e.g. 500mg)"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />
            <TextInput
              value={draft.frequency}
              onChangeText={(v) => setDraft({ ...draft, frequency: v })}
              placeholder="Frequency (e.g. twice daily)"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />
            <TextInput
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="Reminder time (24h, e.g. 08:00)"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />

            <PrimaryButton title={saving ? "Saving…" : "Confirm and save"} onPress={confirmAndSave} />
            <View style={{ height: 10 }} />
            <GhostButton title="Cancel" onPress={() => navigation.goBack()} />
          </View>
        )}
      </View>
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 12, marginTop: 16, marginBottom: 8 },
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 12 },
  warning: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  warningText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14, marginBottom: 10 },
});
