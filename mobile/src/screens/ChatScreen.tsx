import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { colors, fonts, urgencyColor } from "../theme/tokens";
import { Send, Mic, Square, Trash2 } from "lucide-react-native";
import { type CheckinTopic, sendCheckinMessage } from "../services/api";
import { startRecording, stopRecordingAndTranscribe, cancelRecording } from "../services/voiceRecording";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { addRecentActivity } from "../services/recentActivity";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type Msg = { from: "user" | "bot"; text: string; urgency?: "normal" | "monitor" | "urgent"; createdAt: string };
const sexualHealthPrompt =
  "We can talk about STI symptoms, testing, contraception, periods, pregnancy concerns, or reproductive health. I won't diagnose you. What are you noticing, and when did it start?";

function makeMessage(message: Omit<Msg, "createdAt">): Msg {
  return { ...message, createdAt: new Date().toISOString() };
}

function createInitialMessages() {
  return [makeMessage({ from: "bot", text: "How are you feeling today?" })];
}

function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Msg[]>(() => createInitialMessages());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [checkinTopic, setCheckinTopic] = useState<CheckinTopic>("general");
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = makeMessage({ from: "user", text: input });
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await sendCheckinMessage(input, next.map(({ from, text }) => ({ from, text })), checkinTopic);
      if (res.crisisDetected) {
        navigation.navigate("Crisis");
        return;
      }
      await addRecentActivity({
        type: "chat",
        title: checkinTopic === "sexual_health" ? "Sexual health conversation" : "Health check-in conversation",
        detail: res.urgency === "urgent" ? "Urgent guidance was recommended" : "Conversation saved from Chat",
        route: "Chat",
      });
      setMessages([...next, makeMessage({ from: "bot", text: res.reply, urgency: res.urgency })]);
    } catch (e) {
      setMessages([...next, makeMessage({ from: "bot", text: "I couldn't reach the server just now — please try again." })]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const startSexualHealthCheckin = () => {
    if (checkinTopic === "sexual_health") return;
    setCheckinTopic("sexual_health");
    setMessages((prev) => [
      ...prev,
      makeMessage({ from: "user", text: "Sexual health" }),
      makeMessage({ from: "bot", text: sexualHealthPrompt }),
    ]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const deleteChat = () => {
    cancelRecording();
    setRecording(false);
    setTranscribing(false);
    setLoading(false);
    setInput("");
    setCheckinTopic("general");
    setMessages(createInitialMessages());
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
          await addRecentActivity({
            type: "chat",
            title: "Symptom photo added",
            detail: `Location: ${locationLabel}`,
            route: "Chat",
          });
          setMessages((prev) => [...prev, makeMessage({ from: "user", text: `📷 Photo attached - location: ${locationLabel}` })]);
        } catch {
          setMessages((prev) => [...prev, makeMessage({ from: "bot", text: "Couldn't save that photo just now - please try again." })]);
        }
      },
    });
  };

  const toggleRecording = async () => {
    if (!recording) {
      const result = await startRecording();
      if (result.started) {
        setRecording(true);
      } else if (result.error) {
        setMessages((prev) => [...prev, makeMessage({ from: "bot", text: result.error! })]);
      }
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
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: result.error! })]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, i) => (
          <MessageBubble key={`${m.createdAt}-${i}`} message={m} />
        ))}
        {loading && <TypingIndicator />}
      </ScrollView>

      <View style={styles.composer}>
        {recording && <RecordingBanner />}
        {transcribing && (
          <View style={styles.recordingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.recordingText, { marginLeft: 8 }]}>Transcribing…</Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={startSexualHealthCheckin} style={[styles.attachChip, checkinTopic === "sexual_health" && styles.topicChipActive]}>
            <Text style={[styles.attachChipText, checkinTopic === "sexual_health" && styles.topicChipTextActive]}>Sexual health</Text>
          </Pressable>
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
          {checkinTopic === "sexual_health" && (
            <Pressable onPress={deleteChat} style={styles.deleteChip}>
              <Trash2 size={13} color={colors.urgent} />
              <Text style={styles.deleteChipText}>Delete chat</Text>
            </Pressable>
          )}
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
            multiline
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.sendBtn}><Send size={14} color={colors.bg} /></Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message: m }: { message: Msg }) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <View>
        <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={{ color: m.from === "user" ? colors.bg : colors.ink, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19 }}>{m.text}</Text>
        </View>
            <Text style={[styles.timestamp, m.from === "user" ? styles.timestampUser : styles.timestampBot]}>
              {formatMessageTime(m.createdAt)}
            </Text>
            {m.urgency && (
              <View style={styles.urgencyBadge}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgencyColor(m.urgency), marginRight: 6 }} />
                <Text style={{ color: colors.peach, fontFamily: fonts.body, fontSize: 10 }}>Recommend: see a doctor soon</Text>
              </View>
            )}
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dots = useRef([new Animated.Value(0.25), new Animated.Value(0.25), new Animated.Value(0.25)]).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 130),
          Animated.timing(dot, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
      {dots.map((dot, index) => (
        <Animated.View key={index} style={[styles.typingDot, { opacity: dot, transform: [{ scale: dot }] }]} />
      ))}
    </View>
  );
}

function RecordingBanner() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] });

  return (
    <View style={styles.recordingBanner}>
      <View style={styles.recordingDotWrap}>
        <Animated.View style={[styles.recordingPulse, { opacity, transform: [{ scale }] }]} />
        <View style={styles.recordingDot} />
      </View>
      <Text style={styles.recordingText}>Listening - tap the mic again to stop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messagesContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  bubble: { maxWidth: "80%", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  timestamp: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5, marginBottom: 10 },
  timestampUser: { alignSelf: "flex-end", marginRight: 4 },
  timestampBot: { alignSelf: "flex-start", marginLeft: 4 },
  urgencyBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.peachDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14, marginLeft: 4 },
  composer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 18 : 12, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  recordingBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  recordingDotWrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center", marginRight: 6 },
  recordingPulse: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: colors.urgent },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.urgent },
  recordingText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5 },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 13, marginBottom: 12 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkFaint },
  attachChip: { alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, marginLeft: 2 },
  attachChipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11 },
  topicChipActive: { backgroundColor: colors.mintDim },
  topicChipTextActive: { color: colors.mint },
  deleteChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.urgentDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, marginLeft: 2 },
  deleteChipText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 11, marginLeft: 6 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6, gap: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, maxHeight: 104, color: colors.ink, fontFamily: fonts.body, fontSize: 13, paddingTop: 9, paddingBottom: 9 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
