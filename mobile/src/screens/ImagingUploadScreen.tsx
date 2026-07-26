import React, { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const SCAN_TYPES = ["X-ray", "CT", "MRI", "Ultrasound"];

export default function ImagingUploadScreen({ navigation }: any) {
  const [kind, setKind] = useState<"report_text" | "scan_image" | null>(null);
  const [scanType, setScanType] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ explanation?: string; message?: string } | null>(null);

  const capture = async () => {
    const picked = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (picked.canceled) return;
    setImageUri(picked.assets[0].uri);
    setLoading(true);

    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const res = await fetch(`${API_BASE_URL}/imaging/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: picked.assets[0].base64, kind, scanType }),
      });
      setResult(await res.json());
    } catch {
      setResult({ message: "We couldn't save that just now — please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: what kind of image is this — asked directly, not guessed.
  if (!kind) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60 }}>
        <ScreenHeader title="Add a scan or report" subtitle="Which do you have?" />
        <View style={{ gap: 12 }}>
          <PrimaryButton title="A written radiology report" onPress={() => setKind("report_text")} />
          <GhostButton title="The scan image itself (X-ray/CT/MRI/ultrasound)" onPress={() => setKind("scan_image")} />
        </View>
        <Text style={styles.hint}>
          We only explain written reports in plain language. Scan images are saved to your record for your doctor — we don't interpret them.
        </Text>
      </View>
    );
  }

  // Step 2 (scan_image only): what type of scan, for labeling.
  if (kind === "scan_image" && !scanType) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60 }}>
        <ScreenHeader title="What type of scan?" />
        <View style={{ gap: 10 }}>
          {SCAN_TYPES.map((t) => (
            <GhostButton key={t} title={t} onPress={() => setScanType(t)} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={kind === "report_text" ? "Radiology report" : `${scanType} scan`} />
      <View style={{ paddingHorizontal: 28 }}>
        {!imageUri && <PrimaryButton title="Take a photo" onPress={capture} />}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
        {loading && <Text style={styles.loading}>Saving…</Text>}
        {result && (
          <View style={{ marginTop: 16 }}>
            {result.explanation && (
              <Card>
                <Text style={styles.text}>{result.explanation}</Text>
              </Card>
            )}
            {result.message && <Text style={styles.text}>{result.message}</Text>}
            <View style={{ marginTop: 16 }}>
              <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 18, marginTop: 16 },
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  text: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 20, lineHeight: 16 },
});
