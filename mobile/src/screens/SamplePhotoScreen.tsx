import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, FlaskConical, ImagePlus, ShieldCheck, Trash2 } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { apiFetch, authHeader } from "../services/api";
import { addRecentActivity } from "../services/recentActivity";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const MAX_IMAGE_BYTES = 6_000_000;

type SampleType = "urine";
type SampleResult = {
  id: string;
  description: string;
  tier: "normal" | "urgent";
  urgentMessage: string | null;
};

const sampleOptions: { id: SampleType; title: string; detail: string }[] = [
  { id: "urine", title: "Urine sample", detail: "Use a clear, well-lit photo of the sample container." },
];

export default function SamplePhotoScreen({ navigation }: any) {
  const [sampleType, setSampleType] = useState<SampleType | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleResult | null>(null);

  const pickPhoto = async (source: "camera" | "library") => {
    if (!sampleType || loading) return;
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", source === "camera" ? "Camera access is needed to take a sample photo." : "Photo library access is needed to upload a sample photo.");
      return;
    }

    const picked =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.45, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.45, allowsEditing: false, mediaTypes: ["images"] });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (!asset?.uri || !asset.base64) {
      Alert.alert("Photo unavailable", "Remi could not read that photo. Please try again.");
      return;
    }

    const info = await FileSystem.getInfoAsync(asset.uri);
    if (info.exists && typeof info.size === "number" && info.size > MAX_IMAGE_BYTES) {
      Alert.alert("Photo too large", "Please try a closer, smaller photo so Remi can upload it reliably.");
      return;
    }

    setImageUri(asset.uri);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/sample-photos/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ imageBase64: asset.base64, sampleType }),
      });
      if (!res.ok) throw new Error(`Sample check failed: ${res.status}`);
      const data = (await res.json()) as SampleResult;
      setResult(data);
      await addRecentActivity({
        type: "chat",
        title: `${labelFor(sampleType)} sample checked`,
        detail: data.tier === "urgent" ? "Urgent follow-up recommended" : "Sample note saved from Sample check",
        route: "SamplePhoto",
      });
    } catch (error: any) {
      setResult({
        id: "",
        description: error?.message || "We couldn't read that photo right now. Please try again when your connection is stable.",
        tier: "normal",
        urgentMessage: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async () => {
    if (!result?.id) {
      setImageUri(null);
      setResult(null);
      return;
    }
    try {
      await apiFetch(`${API_BASE_URL}/sample-photos/${result.id}`, {
        method: "DELETE",
        headers: await authHeader(),
      });
      navigation.goBack();
    } catch {
      Alert.alert("Delete failed", "Remi could not delete this photo right now. Please try again.");
    }
  };

  if (result?.tier === "urgent") {
    return (
      <View style={styles.urgentScreen}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.urgentCard}>
          <View style={styles.urgentIcon}>
            <AlertTriangle size={28} color={colors.urgent} />
          </View>
          <Text style={styles.urgentEyebrow}>FOLLOW-UP RECOMMENDED</Text>
          <Text style={styles.urgentTitle}>Please see a doctor promptly</Text>
          {result.urgentMessage ? <Text style={styles.urgentBody}>{result.urgentMessage}</Text> : null}
          <Text style={styles.urgentBody}>{result.description}</Text>
        </View>
        <View style={styles.footerActions}>
          <Pressable onPress={() => navigation.navigate("Chat")} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Prepare doctor visit</Text>
          </Pressable>
          <Pressable onPress={deletePhoto} style={styles.deleteAction}>
            <Trash2 size={15} color={colors.urgent} />
            <Text style={styles.deleteText}>Delete this photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <ShieldCheck size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Private</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <FlaskConical size={29} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>SAMPLE CHECK</Text>
        <Text style={styles.title}>Check a sample photo safely.</Text>
        <Text style={styles.subtitle}>Remi gives a plain-language note from the photo. It does not diagnose, and concerning signs should be checked by a doctor.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose sample type</Text>
        {sampleOptions.map((option) => {
          const active = sampleType === option.id;
          return (
            <Pressable key={option.id} onPress={() => setSampleType(option.id)} style={[styles.optionCard, active && styles.optionCardActive]}>
              <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                {active ? <CheckCircle2 size={18} color={colors.bg} /> : <FlaskConical size={18} color={colors.primary} />}
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add photo</Text>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => pickPhoto("camera")} disabled={!sampleType || loading} style={[styles.photoAction, (!sampleType || loading) && styles.disabledAction]}>
            <Camera size={18} color={colors.primary} />
            <Text style={styles.photoActionText}>Take photo</Text>
          </Pressable>
          <Pressable onPress={() => pickPhoto("library")} disabled={!sampleType || loading} style={[styles.photoAction, (!sampleType || loading) && styles.disabledAction]}>
            <ImagePlus size={18} color={colors.primary} />
            <Text style={styles.photoActionText}>Upload</Text>
          </Pressable>
        </View>
        {!sampleType ? <Text style={styles.helperText}>Select urine before adding a photo.</Text> : null}
      </View>

      {imageUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <View style={styles.previewMeta}>
            <Text style={styles.previewTitle}>{sampleType ? labelFor(sampleType) : "Sample"} photo</Text>
            <Text style={styles.previewText}>Stored privately with your Remi record.</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loading}>Checking the photo...</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View style={styles.resultIcon}>
              <CheckCircle2 size={18} color={colors.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>Sample note</Text>
              <Text style={styles.resultSub}>Descriptive guidance only</Text>
            </View>
          </View>
          <Text style={styles.description}>{result.description}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Done</Text>
          </Pressable>
          <Pressable onPress={deletePhoto} style={styles.deleteAction}>
            <Trash2 size={15} color={colors.urgent} />
            <Text style={styles.deleteText}>Delete this photo</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function labelFor(sampleType: SampleType) {
  return "Urine";
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 14, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: 0 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14, marginBottom: 10 },
  optionCard: { minHeight: 72, flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.bg, padding: 13, marginBottom: 9 },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  optionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionIconActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  optionDetail: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  actionGrid: { flexDirection: "row", gap: 10 },
  photoAction: { flex: 1, minHeight: 52, borderRadius: 999, backgroundColor: colors.primaryDim, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  disabledAction: { opacity: 0.45 },
  photoActionText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  helperText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  previewCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden", marginBottom: 12 },
  preview: { width: "100%", height: 220, backgroundColor: colors.surfaceRaised },
  previewMeta: { padding: 14 },
  previewTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  previewText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  loadingCard: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
  loading: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12.5 },
  resultCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16 },
  resultTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  resultIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  resultTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  resultSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  description: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  primaryAction: { minHeight: 50, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryActionText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  deleteAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10 },
  deleteText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  urgentScreen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 36 },
  urgentCard: { flex: 1, backgroundColor: colors.urgentDim, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.urgent, padding: 20 },
  urgentIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  urgentEyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 8 },
  urgentTitle: { color: colors.urgent, fontFamily: fonts.display, fontSize: 27, lineHeight: 34, letterSpacing: 0, marginBottom: 10 },
  urgentBody: { color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 21, marginBottom: 10 },
  footerActions: { paddingTop: 14 },
});
