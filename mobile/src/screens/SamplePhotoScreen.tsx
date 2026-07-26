import React, { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";
import { Trash2, AlertTriangle } from "lucide-react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function SamplePhotoScreen({ navigation }: any) {
  const [sampleType, setSampleType] = useState<"urine" | "stool" | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; description: string; tier: "normal" | "urgent"; urgentMessage: string | null } | null>(null);

  const capture = async (type: "urine" | "stool") => {
    setSampleType(type);
    const picked = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (picked.canceled) return;
    setImageUri(picked.assets[0].uri);
    setLoading(true);

    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      const res = await fetch(`${API_BASE_URL}/sample-photos/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: picked.assets[0].base64, sampleType: type }),
      });
      setResult(await res.json());
    } catch {
      setResult({ id: "", description: "We couldn't read that photo — please try again.", tier: "normal", urgentMessage: null });
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async () => {
    if (!result?.id) return;
    const token = await SecureStore.getItemAsync("remi_session_token");
    await fetch(`${API_BASE_URL}/sample-photos/${result.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    navigation.goBack();
  };

  if (result?.tier === "urgent") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.urgentDim, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 36, justifyContent: "space-between" }}>
        <View>
          <AlertTriangle size={26} color={colors.urgent} />
          <Text style={styles.urgentTitle}>Please see a doctor promptly</Text>
          <Text style={styles.urgentBody}>{result.urgentMessage}</Text>
          <Text style={styles.urgentBody}>{result.description}</Text>
        </View>
        <View>
          <PrimaryButton title="Recommend a doctor visit" onPress={() => navigation.navigate("Chat")} />
          <View style={{ height: 10 }} />
          <GhostButton title="Delete this photo" onPress={deletePhoto} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Sample check" subtitle="Private — for your understanding, not a diagnosis" />
      <View style={{ paddingHorizontal: 28 }}>
        {!sampleType && (
          <View style={{ gap: 10 }}>
            <PrimaryButton title="Urine sample" onPress={() => capture("urine")} />
            <GhostButton title="Stool sample" onPress={() => capture("stool")} />
          </View>
        )}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
        {loading && <Text style={styles.loading}>Comparing to reference charts…</Text>}
        {result && (
          <View style={{ marginTop: 16 }}>
            <Card>
              <Text style={styles.description}>{result.description}</Text>
            </Card>
            <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
              <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
            </View>
            <Pressable onPress={deletePhoto} style={styles.deleteRow}>
              <Trash2 size={14} color={colors.urgent} />
              <Text style={styles.deleteText}>Delete this photo</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 12, marginTop: 16 },
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  description: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, paddingVertical: 8 },
  deleteText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, marginLeft: 6 },
  urgentTitle: { color: colors.urgent, fontFamily: fonts.display, fontSize: 23, marginTop: 16, marginBottom: 10 },
  urgentBody: { color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginBottom: 10 },
});
