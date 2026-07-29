import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AlertTriangle, Camera, CheckCircle2, Clock3, ImageUp, Pill, Sparkles, X } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { GhostButton, PrimaryButton } from "../components/UI";
import { scheduleMedicationReminder } from "../services/notifications";
import { addRecentActivity } from "../services/recentActivity";
import { authHeader } from "../services/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type Draft = {
  drugName: string;
  purpose: string;
  dose: string;
  frequency: string;
  note: string | null;
  confidence?: "low" | "medium" | "high";
};

export default function PrescriptionScanScreen({ navigation, route }: any) {
  const launchedInitialPicker = useRef(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [awaitingAvailability, setAwaitingAvailability] = useState(false);

  useEffect(() => {
    if (launchedInitialPicker.current) return;
    if (route?.params?.imageUri) {
      launchedInitialPicker.current = true;
      setImageUri(route.params.imageUri);
      setDraft(null);
      if (route.params.imageBase64) {
        scan(route.params.imageBase64);
      } else {
        setDraft(emptyDraft("We couldn't read that image automatically. Please enter the details manually."));
      }
      return;
    }
    if (route?.params?.source !== "camera" && route?.params?.source !== "library") return;
    launchedInitialPicker.current = true;
    const timer = setTimeout(() => pickImage(route.params.source === "camera"), 350);
    return () => clearTimeout(timer);
  }, [route?.params?.imageUri, route?.params?.source]);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          fromCamera ? "Camera access needed" : "Photo access needed",
          fromCamera
            ? "Please allow camera access to take a prescription photo."
            : "Please allow photo access to upload a prescription image.",
        );
        return;
      }

      const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        base64: true,
        quality: 0.45,
        allowsEditing: false,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setDraft(emptyDraft("We couldn't open that image. You can enter the medication details manually."));
        return;
      }

      setImageUri(asset.uri);
      setDraft(null);
      if (!asset.base64) {
        setDraft(emptyDraft("We couldn't read that image automatically. Please enter the details manually."));
        return;
      }
      await scan(asset.base64);
    } catch {
      setDraft(emptyDraft("The image picker could not open. Please try again or enter details manually."));
    }
  };

  const scan = async (imageBase64: string) => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/prescriptions/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDraft({
        drugName: data?.drugName || "",
        purpose: data?.purpose || "",
        dose: "",
        frequency: "",
        note: data?.note || null,
        confidence: data?.confidence || "low",
      });
    } catch {
      setDraft(emptyDraft("Couldn't reach the scanner. You can still enter the prescription details manually."));
    } finally {
      setScanning(false);
    }
  };

  const confirmAndSave = async () => {
    if (!draft || saving) return;
    if (!draft.drugName.trim() || !draft.dose.trim() || !draft.frequency.trim()) {
      Alert.alert("Finish the prescription", "Please add the medication name, dose, and frequency before saving.");
      return;
    }

    setSaving(true);
    try {
      const [hourStr, minuteStr] = reminderTime.split(":");
      const hour = Number(hourStr) || 8;
      const minute = Number(minuteStr) || 0;
      const res = await fetch(`${API_BASE_URL}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          name: draft.drugName.trim(),
          dose: draft.dose.trim(),
          frequency: draft.frequency.trim(),
          hour,
          minute,
          source: route?.params?.recordSource === "chat" ? "chat" : "ocr",
          conversationRef: route?.params?.conversationRef,
        }),
      });
      const saved = await res.json();
      if (!res.ok || !saved?.id) throw new Error();
      await scheduleMedicationReminder(saved.id, hour, minute);
      await addRecentActivity({
        type: "medication",
        title: "Prescription added",
        detail: `${draft.drugName} ${draft.dose}`.trim(),
        route: "Meds",
      });
      setAwaitingAvailability(true);
    } catch {
      Alert.alert("Couldn't save yet", "Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (awaitingAvailability) {
    return (
      <View style={styles.screen}>
        <View style={styles.availability}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={30} color={colors.mint} />
          </View>
          <Text style={styles.availabilityTitle}>Prescription saved</Text>
          <Text style={styles.availabilityText}>Have you already gotten this medication?</Text>
          <PrimaryButton title="Yes, I have it" onPress={() => navigation.goBack()} />
          <GhostButton title="Not yet - find a pharmacy" onPress={() => navigation.replace("PharmacyLookup")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close prescription scanner">
            <X size={20} color={colors.inkSoft} />
          </Pressable>
          <View style={styles.heroIcon}>
            <Pill size={24} color={colors.primary} />
          </View>
          <Text style={styles.eyebrow}>PRESCRIPTION SCAN</Text>
          <Text style={styles.title}>Add medication safely</Text>
          <Text style={styles.subtitle}>Remi can identify the medicine and its general use. You review and complete the details before it becomes a reminder.</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={() => pickImage(true)} style={styles.actionButton}>
            <Camera size={18} color={colors.primary} />
            <Text style={styles.actionText}>Camera</Text>
          </Pressable>
          <Pressable onPress={() => pickImage(false)} style={styles.actionButton}>
            <ImageUp size={18} color={colors.primary} />
            <Text style={styles.actionText}>Upload</Text>
          </Pressable>
        </View>

        {imageUri ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <View style={styles.previewBadge}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.previewBadgeText}>{scanning ? "Reading image" : "Image ready"}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <ImageUp size={26} color={colors.inkFaint} />
            <Text style={styles.emptyPreviewTitle}>No image selected</Text>
            <Text style={styles.emptyPreviewText}>Take a clear photo of the prescription label or upload an existing image.</Text>
          </View>
        )}

        {scanning ? <Text style={styles.loading}>Identifying medication...</Text> : null}

        {draft ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.panelIcon}>
                <Sparkles size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Remi identified</Text>
                <Text style={styles.panelSubtitle}>Check this before filling the remaining fields.</Text>
              </View>
              <Text style={styles.confidence}>{draft.confidence || "low"}</Text>
            </View>

            {draft.note ? (
              <View style={styles.warning}>
                <AlertTriangle size={15} color={colors.peach} />
                <Text style={styles.warningText}>{draft.note}</Text>
              </View>
            ) : null}

            <Input
              label="Medication name"
              value={draft.drugName}
              onChangeText={(v) => setDraft({ ...draft, drugName: v })}
              placeholder="e.g. Amlodipine"
            />
            <Input
              label="What it generally does"
              value={draft.purpose}
              onChangeText={(v) => setDraft({ ...draft, purpose: v })}
              placeholder="e.g. Helps lower blood pressure"
              multiline
            />

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>Complete the prescription</Text>
            <Input
              label="Dose"
              value={draft.dose}
              onChangeText={(v) => setDraft({ ...draft, dose: v })}
              placeholder="e.g. 5 mg"
            />
            <Input
              label="Frequency"
              value={draft.frequency}
              onChangeText={(v) => setDraft({ ...draft, frequency: v })}
              placeholder="e.g. once daily"
            />
            <Input
              label="Reminder time"
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="08:00"
              leftIcon={<Clock3 size={15} color={colors.inkFaint} />}
            />

            <PrimaryButton title={saving ? "Saving..." : "Confirm and save"} onPress={confirmAndSave} />
            <GhostButton title="Cancel" onPress={() => navigation.goBack()} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  leftIcon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  leftIcon?: React.ReactNode;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, multiline && styles.inputMultiline, leftIcon ? styles.inputWithIcon : null]}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

function emptyDraft(note: string): Draft {
  return { drugName: "", purpose: "", dose: "", frequency: "", note, confidence: "low" };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 36 },
  header: {
    paddingTop: 32,
    paddingBottom: 18,
  },
  closeButton: {
    position: "absolute",
    top: 28,
    right: 0,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 330 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  previewCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  preview: { width: "100%", height: 230 },
  previewBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  previewBadgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  emptyPreview: {
    minHeight: 190,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  emptyPreviewTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15, marginTop: 12 },
  emptyPreviewText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 6 },
  loading: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginTop: 14 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 16,
    marginTop: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  panelIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  panelTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  panelSubtitle: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  confidence: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "uppercase" },
  warning: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 13, padding: 13, marginBottom: 13 },
  warningText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 9, flex: 1, lineHeight: 17 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5, marginBottom: 10 },
  inputGroup: { marginBottom: 11 },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 7 },
  inputWrap: {
    minHeight: 52,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  inputWrapMultiline: { minHeight: 84, justifyContent: "flex-start" },
  leftIcon: { position: "absolute", left: 14, top: 18 },
  input: { color: colors.ink, fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 14, paddingVertical: 13 },
  inputWithIcon: { paddingLeft: 38 },
  inputMultiline: { minHeight: 82, textAlignVertical: "top" },
  availability: { flex: 1, paddingHorizontal: 26, alignItems: "stretch", justifyContent: "center", gap: 12 },
  successIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 6 },
  availabilityTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, textAlign: "center" },
  availabilityText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: "center", marginBottom: 10 },
});
