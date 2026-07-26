import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { colors, radius, fonts, urgencyColor } from "../theme/tokens";
import { Send, Mic, Square } from "lucide-react-native";
import { sendCheckinMessage } from "../services/api";
import { startRecording, stopRecordingAndTranscribe, cancelRecording } from "../services/voiceRecording";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type Msg = { from: "user" | "bot"; text: string; urgency?: "normal" | "monitor" | "urgent" };

export default function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: "How are you feeling today, Ama?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Msg = { from: "user", text: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await sendCheckinMessage(input, next.map(({ from, text }) => ({ from, text })));
      if (res.crisisDetected) {
        navigation.navigate("Crisis");
        return;
      }
      setMessages([...next, { from: "bot", text: res.reply, urgency: res.urgency }]);
    } catch (e) {
      setMessages([...next, { from: "bot", text: "I couldn't reach the server just now — please try again." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const capturePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (result.canceled) return;
    const photoBase64 = result.assets[0].base64!;

    // Location confirmation happens BEFORE anything is saved — the
    // app records only where the photo is of, never what it shows.
    navigation.navigate("BodyMap", {
      onSelect: async (locationLabel: string) => {
        const token = await SecureStore.getItemAsync("remi_session_token");
        try {
          await fetch(`${API_BASE_URL}/symptom-media/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ imageBase64: photoBase64, bodyLocation: locationLabel }),
          });
          setMessages((prev) => [...prev, { from: "user", text: `📷 Photo attached — location: ${locationLabel}` }]);
        } catch {
          setMessages((prev) => [...prev, { from: "bot", text: "Couldn't save that photo just now — please try again." }]);
        }
      },
    });
  };

  const toggleRecording = async () => {
    if (!recording) {
      const started = await startRecording();
      if (started) setRecording(true);
      return;
    }
    // Stopping: transcribe and drop the text into the input field for
    // the user to review — it is NEVER sent automatically. This is
    // the same "user confirms what was understood" rule used for the
    // prescription OCR draft.
    setRecording(false);
    setTranscribing(true);
    const result = await stopRecordingAndTranscribe();
    setTranscribing(false);
    if (result.text) {
      setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
    } else if (result.error) {
      setMessages((prev) => [...prev, { from: "bot", text: result.error! }]);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} style={{ flex: 1, paddingHorizontal: 20, paddingTop: 60 }}>
        {messages.map((m, i) => (
          <View key={i}>
            <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={{ color: m.from === "user" ? colors.bg : colors.ink, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19 }}>{m.text}</Text>
            </View>
            {m.urgency && (
              <View style={styles.urgencyBadge}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgencyColor(m.urgency), marginRight: 6 }} />
                <Text style={{ color: colors.peach, fontFamily: fonts.body, fontSize: 10 }}>Recommend: see a doctor soon</Text>
              </View>
            )}
          </View>
        ))}
        {loading && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, marginLeft: 4 }}>Remi is thinking…</Text>}
      </ScrollView>

      <View style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
        {recording && (
          <View style={styles.recordingBanner}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening — tap the mic again to stop</Text>
          </View>
        )}
        {transcribing && (
          <View style={styles.recordingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.recordingText, { marginLeft: 8 }]}>Transcribing…</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={capturePhoto} style={styles.attachChip}>
            <Text style={styles.attachChipText}>📷 Add photo</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("LabUpload")} style={styles.attachChip}>
            <Text style={styles.attachChipText}>📄 Add lab report</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("SamplePhoto")} style={styles.attachChip}>
            <Text style={styles.attachChipText}>🧪 Sample check</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ImagingUpload")} style={styles.attachChip}>
            <Text style={styles.attachChipText}>🩻 Add scan</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.inputRow}>
          <Pressable
            onPress={toggleRecording}
            style={[styles.micBtn, recording && { backgroundColor: colors.urgentDim }]}
          >
            {recording ? <Square size={13} color={colors.urgent} /> : <Mic size={15} color={colors.inkSoft} />}
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Tell me what's going on…"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.sendBtn}><Send size={14} color={colors.bg} /></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "80%", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  urgencyBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.peachDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14, marginLeft: 4 },
  recordingBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.urgent, marginRight: 8 },
  recordingText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5 },
  attachChip: { alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, marginLeft: 2 },
  attachChipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 6, gap: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
