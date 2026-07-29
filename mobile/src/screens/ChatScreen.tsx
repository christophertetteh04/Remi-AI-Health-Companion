import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { colors, fonts, urgencyColor } from "../theme/tokens";
import { Camera, FileText, FlaskConical, HeartPulse, Mic, ScanLine, Send, ShieldCheck, Sparkles, Square, Trash2, Venus, X } from "lucide-react-native";
import { type CheckinTopic, type DocumentUploadCategory, sendCheckinMessage, uploadCheckinImage } from "../services/api";
import { startRecording, stopRecordingAndTranscribe, cancelRecording, cancelTranscription } from "../services/voiceRecording";
import * as ImagePicker from "expo-image-picker";
import { addRecentActivity } from "../services/recentActivity";
import { clearChatMemory, loadChatMemory, saveChatMemory } from "../services/chatMemory";
import { buildHealthMemoryContext } from "../services/healthMemory";
import { trackEvent } from "../services/posthog";

const BODY_LOCATIONS = ["Head", "Chest", "Abdomen", "Arm", "Leg", "Back", "Skin", "Other"];
const DOCUMENT_CHOICES: { category: DocumentUploadCategory; label: string }[] = [
  { category: "lab_report", label: "Lab report" },
  { category: "prescription", label: "Prescription" },
  { category: "scan_report", label: "Scan report" },
  { category: "scan_image", label: "Scan image" },
  { category: "symptom_photo", label: "Symptom photo" },
  { category: "sample_photo", label: "Sample photo" },
  { category: "general_medical_document", label: "Medical document" },
];

type Msg = { from: "user" | "bot"; text: string; imageUri?: string; urgency?: "normal" | "monitor" | "urgent"; createdAt: string };
type PendingUpload = {
  uri: string;
  base64: string;
  mediaType: string;
  conversationRef: string;
};
type PendingUploadAction = {
  mode: "document_type" | "sample_type";
  upload: PendingUpload;
};
const sexualHealthPrompt =
  "We can talk about STI symptoms, testing, contraception, periods, pregnancy concerns, or reproductive health. I won't diagnose you. What are you noticing, and when did it start?";

function makeMessage(message: Omit<Msg, "createdAt">): Msg {
  return { ...message, createdAt: new Date().toISOString() };
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

function timeOfDay(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function ChatScreen({ navigation }: any) {
  const accessedAt = useRef(new Date()).current;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [checkinTopic, setCheckinTopic] = useState<CheckinTopic>("general");
  const [pendingPhotoUpload, setPendingPhotoUpload] = useState<PendingUpload | null>(null);
  const [pendingUploadAction, setPendingUploadAction] = useState<PendingUploadAction | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const suggestedPrompts = [
    "I have a headache and feel tired",
    "Help me understand my symptoms",
    "Give me my weekly health brief",
  ];

  useEffect(() => {
    loadChatMemory().then((stored) => {
      if (stored.length) setMessages(stored);
    });
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = makeMessage({ from: "user", text: input });
    const next = [...messages, userMsg];
    setMessages(next);
    await saveChatMemory(next);
    setInput("");
    setLoading(true);
    try {
      const memoryContext = await buildHealthMemoryContext();
      const res = await sendCheckinMessage(input, messages.map(({ from, text }) => ({ from, text })), checkinTopic, memoryContext);
      await trackEvent("checkin_message_sent", { tier: res.urgency });
      if (res.crisisDetected) {
        await trackEvent("crisis_protocol_triggered");
        navigation.navigate("Crisis");
        return;
      }
      await addRecentActivity({
        type: "chat",
        title: checkinTopic === "sexual_health" ? "Sexual health conversation" : "Health check-in conversation",
        detail: res.urgency === "urgent" ? "Urgent guidance was recommended" : "Conversation saved from Chat",
        route: "Chat",
      });
      const updated = [...next, makeMessage({ from: "bot", text: res.reply, urgency: res.urgency })];
      setMessages(updated);
      await saveChatMemory(updated);
    } catch (e: any) {
      console.log("Check-in chat error:", e?.message || String(e));
      const updated = [...next, makeMessage({ from: "bot", text: "I’m having trouble connecting to Remi right now. Please check that the backend is running, then try again." })];
      setMessages(updated);
      await saveChatMemory(updated);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const startSexualHealthCheckin = () => {
    if (checkinTopic === "sexual_health") return;
    setCheckinTopic("sexual_health");
    const updated = [
      ...messages,
      makeMessage({ from: "user", text: "Sexual health" }),
      makeMessage({ from: "bot", text: sexualHealthPrompt }),
    ];
    setMessages(updated);
    saveChatMemory(updated);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const deleteChat = () => {
    cancelRecording();
    setRecording(false);
    setTranscribing(false);
    setLoading(false);
    setInput("");
    setCheckinTopic("general");
    setMessages([]);
    clearChatMemory();
  };

  const appendMessages = async (items: Msg[]) => {
    let updated: Msg[] = [];
    setMessages((prev) => {
      updated = [...prev, ...items];
      return updated;
    });
    await saveChatMemory(updated);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return updated;
  };

  const chooseSymptomPhoto = () => {
    Alert.alert("Add image", "Choose how you want to add a photo or document.", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => pickSymptomPhoto("camera") },
      { text: "Upload image", onPress: () => pickSymptomPhoto("library") },
    ]);
  };

  const pickSymptomPhoto = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: source === "camera" ? "Camera permission is needed to take a symptom photo." : "Photo library permission is needed to upload an image." })]);
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: false, quality: 0.25, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.25, allowsEditing: false, mediaTypes: ["images"] });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) {
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: "I couldn't read that image. Please try another photo." })]);
      return;
    }
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === "number" && info.size > 6_000_000) {
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: "That image is too large. Please try a closer, smaller photo." })]);
      return;
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const upload = {
      uri,
      base64,
      mediaType: result.assets[0]?.mimeType || "image/jpeg",
      conversationRef: new Date().toISOString(),
    };
    await appendMessages([
      makeMessage({ from: "user", text: "Image attached for Remi to review.", imageUri: uri }),
      makeMessage({ from: "bot", text: "Looking at this..." }),
    ]);
    await processCheckinUpload(upload);
  };

  const uploadPendingPhoto = async (locationLabel: string) => {
    if (!pendingPhotoUpload || savingPhoto) return;
    setSavingPhoto(true);
    try {
      const upload = pendingPhotoUpload;
      setPendingPhotoUpload(null);
      const data = await uploadCheckinImage({
        imageBase64: upload.base64,
        mediaType: upload.mediaType,
        conversationRef: upload.conversationRef,
        confirmedCategory: "symptom_photo",
        bodyLocation: locationLabel,
      });
      await addRecentActivity({
        type: "chat",
        title: "Symptom photo added",
        detail: `Location: ${locationLabel}`,
        route: "Chat",
      });
      await appendMessages([makeMessage({ from: "bot", text: data.message || `Saved this symptom photo with location: ${locationLabel}.` })]);
    } catch (error: any) {
      console.log("Symptom photo upload error:", error?.message || String(error));
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: error?.message || "Couldn't save that photo just now. Please try again with a smaller image." })]);
    } finally {
      setSavingPhoto(false);
    }
  };

  const processCheckinUpload = async (
    upload: PendingUpload,
    extra?: { confirmedCategory?: DocumentUploadCategory; sampleType?: "urine" | "stool"; bodyLocation?: string },
  ) => {
    setLoading(true);
    setPendingUploadAction(null);
    try {
      const data = await uploadCheckinImage({
        imageBase64: upload.base64,
        mediaType: upload.mediaType,
        conversationRef: upload.conversationRef,
        confirmedCategory: extra?.confirmedCategory,
        sampleType: extra?.sampleType,
        bodyLocation: extra?.bodyLocation,
      });
      const category = data.classification?.category;
      if (data.status === "needs_confirmation") {
        setPendingUploadAction({ mode: "document_type", upload });
        await appendMessages([makeMessage({ from: "bot", text: data.message || "I’m not fully sure what type of item this is. Which one should I use?" })]);
        return;
      }
      if (data.status === "needs_body_location") {
        setPendingPhotoUpload(upload);
        await appendMessages([makeMessage({ from: "bot", text: data.message || "This looks like a symptom photo. Where on the body should I label it?" })]);
        return;
      }
      if (data.status === "needs_sample_type") {
        setPendingUploadAction({ mode: "sample_type", upload });
        await appendMessages([makeMessage({ from: "bot", text: data.message || "Is this a urine sample or a stool sample?" })]);
        return;
      }
      if (data.status === "route_to_prescription_confirmation") {
        await appendMessages([makeMessage({ from: "bot", text: data.message || "This looks like a prescription. Let's go through the details together before anything is saved." })]);
        navigation.navigate("PrescriptionScan", {
          imageUri: upload.uri,
          imageBase64: upload.base64,
          recordSource: "chat",
          conversationRef: upload.conversationRef,
        });
        return;
      }
      await addRecentActivity({
        type: category === "lab_report" ? "lab" : "chat",
        title: category ? `${categoryLabel(category)} uploaded` : "Chat upload processed",
        detail: "Saved from your Remi check-in",
        route: category === "lab_report" ? "LabUpload" : "Chat",
      });
      await appendMessages([makeMessage({ from: "bot", text: resultMessage(data) })]);
    } catch (error: any) {
      console.log("Check-in upload error:", error?.message || String(error));
      await appendMessages([makeMessage({ from: "bot", text: error?.message || "I couldn't process that image just now. Please try again with a clearer photo." })]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDocumentType = (category: DocumentUploadCategory) => {
    const action = pendingUploadAction;
    if (!action) return;
    processCheckinUpload(action.upload, { confirmedCategory: category });
  };

  const confirmSampleType = (sampleType: "urine" | "stool") => {
    const action = pendingUploadAction;
    if (!action) return;
    processCheckinUpload(action.upload, { confirmedCategory: "sample_photo", sampleType });
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
    } else if (result.error === "Transcription canceled.") {
      return;
    } else if (result.error) {
      setMessages((prev) => [...prev, makeMessage({ from: "bot", text: result.error! })]);
    }
  };

  const cancelTranscribing = () => {
    cancelTranscription();
    setTranscribing(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerMark}>
          <HeartPulse size={20} color={colors.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Remi Chat</Text>
          <Text style={styles.headerSub}>Private health companion</Text>
        </View>
        <View style={styles.headerStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.headerStatusText}>Online</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedGreetingCard accessedAt={accessedAt} />
        {messages.length === 0 && (
          <View style={styles.promptGrid}>
            {suggestedPrompts.map((prompt) => (
              <Pressable key={prompt} onPress={() => setInput(prompt)} style={styles.promptCard}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={`${m.createdAt}-${i}`} message={m} />
        ))}
        {pendingUploadAction?.mode === "document_type" && (
          <QuickReplyPanel title="What kind of item is this?">
            {DOCUMENT_CHOICES.map((choice) => (
              <Pressable key={choice.category} onPress={() => confirmDocumentType(choice.category)} style={styles.quickReplyButton}>
                <Text style={styles.quickReplyText}>{choice.label}</Text>
              </Pressable>
            ))}
          </QuickReplyPanel>
        )}
        {pendingUploadAction?.mode === "sample_type" && (
          <QuickReplyPanel title="Which sample is this?">
            <Pressable onPress={() => confirmSampleType("urine")} style={styles.quickReplyButton}>
              <Text style={styles.quickReplyText}>Urine</Text>
            </Pressable>
            <Pressable onPress={() => confirmSampleType("stool")} style={styles.quickReplyButton}>
              <Text style={styles.quickReplyText}>Stool</Text>
            </Pressable>
          </QuickReplyPanel>
        )}
        {loading && <TypingIndicator />}
      </ScrollView>

      <View style={styles.composer}>
        {recording && <RecordingBanner />}
        {transcribing && (
          <View style={styles.recordingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.recordingText, { marginLeft: 8 }]}>Transcribing…</Text>
            <Pressable onPress={cancelTranscribing} style={styles.cancelTranscribeButton}>
              <X size={13} color={colors.urgent} />
              <Text style={styles.cancelTranscribeText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachRail}>
          <Pressable onPress={startSexualHealthCheckin} style={[styles.attachChip, checkinTopic === "sexual_health" && styles.topicChipActive]}>
            <Venus size={13} color={checkinTopic === "sexual_health" ? colors.mint : colors.inkSoft} />
            <Text style={[styles.attachChipText, checkinTopic === "sexual_health" && styles.topicChipTextActive]}>Sexual health</Text>
          </Pressable>
          <Pressable onPress={chooseSymptomPhoto} style={styles.attachChip}>
            <Camera size={13} color={colors.inkSoft} />
            <Text style={styles.attachChipText}>Photo</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("LabUpload")} style={styles.attachChip}>
            <FileText size={13} color={colors.inkSoft} />
            <Text style={styles.attachChipText}>Lab report</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("SamplePhoto")} style={styles.attachChip}>
            <FlaskConical size={13} color={colors.inkSoft} />
            <Text style={styles.attachChipText}>Sample</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ImagingUpload")} style={styles.attachChip}>
            <ScanLine size={13} color={colors.inkSoft} />
            <Text style={styles.attachChipText}>Scan</Text>
          </Pressable>
          {messages.length > 0 && (
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

      <Modal visible={!!pendingPhotoUpload} transparent animationType="fade" onRequestClose={() => setPendingPhotoUpload(null)}>
        <View style={styles.locationBackdrop}>
          <View style={styles.locationSheet}>
            <Text style={styles.locationTitle}>Where is this photo from?</Text>
            <Text style={styles.locationSub}>Remi stores the location label only. The photo is not interpreted by AI.</Text>
            <View style={styles.locationGrid}>
              {BODY_LOCATIONS.map((location) => (
                <Pressable key={location} onPress={() => uploadPendingPhoto(location)} disabled={savingPhoto} style={styles.locationButton}>
                  <Text style={styles.locationButtonText}>{location}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setPendingPhotoUpload(null)} disabled={savingPhoto} style={styles.locationCancel}>
              <Text style={styles.locationCancelText}>{savingPhoto ? "Saving..." : "Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function categoryLabel(category: DocumentUploadCategory) {
  const labels: Record<DocumentUploadCategory, string> = {
    lab_report: "Lab report",
    prescription: "Prescription",
    scan_report: "Scan report",
    scan_image: "Scan image",
    symptom_photo: "Symptom photo",
    sample_photo: "Sample photo",
    general_medical_document: "Medical document",
    unclear: "Upload",
  };
  return labels[category];
}

function resultMessage(data: any) {
  const category = data?.classification?.category as DocumentUploadCategory | undefined;
  const label = category ? categoryLabel(category).toLowerCase() : "upload";
  const result = data?.result || {};
  if (result.explanation) return `This looks like a ${label}. ${result.explanation}`;
  if (result.message) return result.message;
  if (data?.message) return data.message;
  return `Saved this ${label} from your check-in.`;
}

function QuickReplyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.quickReplyPanel}>
      <Text style={styles.quickReplyTitle}>{title}</Text>
      <View style={styles.quickReplyGrid}>{children}</View>
    </View>
  );
}

function AnimatedGreetingCard({ accessedAt }: { accessedAt: Date }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 360, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [opacity, pulse, translateY]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View style={[styles.greetingCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.greetingTop}>
        <View style={styles.remiMark}>
          <Animated.View style={[styles.remiPulse, { transform: [{ scale }] }]} />
          <HeartPulse size={22} color={colors.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.remiName}>Remi</Text>
          <Text style={styles.remiStatus}>Your health companion</Text>
        </View>
        <View style={styles.secureBadge}>
          <ShieldCheck size={12} color={colors.mint} />
          <Text style={styles.secureText}>Private</Text>
        </View>
      </View>
      <Text style={styles.greetingTitle}>Hey, I'm Remi, your health companion.</Text>
      <Text style={styles.greetingBody}>How are you feeling this {timeOfDay(accessedAt)}?</Text>
      <Text style={styles.greetingTime}>Opened {formatMessageTime(accessedAt.toISOString())}</Text>
    </Animated.View>
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
      <View style={[styles.messageRow, m.from === "user" && styles.messageRowUser]}>
        {m.from === "bot" && (
          <View style={styles.messageAvatar}>
            <HeartPulse size={13} color={colors.primary} />
          </View>
        )}
        <View style={styles.messageBlock}>
          <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot]}>
            {m.imageUri ? <Image source={{ uri: m.imageUri }} style={styles.messageImage} /> : null}
            <Text selectable style={{ color: m.from === "user" ? colors.bg : colors.ink, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19 }}>{m.text}</Text>
          </View>
          <Text style={[styles.timestamp, m.from === "user" ? styles.timestampUser : styles.timestampBot]}>
            {formatMessageTime(m.createdAt)}
          </Text>
          {m.urgency && (
            <View style={styles.urgencyBadge}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgencyColor(m.urgency), marginRight: 6 }} />
              <Text style={{ color: urgencyColor(m.urgency), fontFamily: fonts.bodySemiBold, fontSize: 10 }}>
                {urgencyLabel(m.urgency)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function urgencyLabel(urgency: "normal" | "monitor" | "urgent") {
  if (urgency === "urgent") return "Urgent: seek medical care promptly";
  if (urgency === "monitor") return "Monitor: consider checking with a clinician";
  return "General guidance";
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 54, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  headerMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  headerSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  headerStatus: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint, marginRight: 6 },
  headerStatusText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  messagesContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
  greetingCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 14, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  greetingTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  remiMark: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" },
  remiPulse: { position: "absolute", width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.14)" },
  remiName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  remiStatus: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.mintDim, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  secureText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  greetingTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 22, lineHeight: 29 },
  greetingBody: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 8 },
  greetingTime: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 12 },
  promptGrid: { gap: 8, marginBottom: 16 },
  promptCard: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.primaryDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  promptText: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5, flex: 1 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
  messageRowUser: { justifyContent: "flex-end" },
  messageAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 8, marginBottom: 20 },
  messageBlock: { maxWidth: "82%" },
  bubble: { borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 4 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  messageImage: { width: 190, height: 150, borderRadius: 12, marginBottom: 9, backgroundColor: colors.surfaceRaised },
  timestamp: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5, marginBottom: 10 },
  timestampUser: { alignSelf: "flex-end", marginRight: 4 },
  timestampBot: { alignSelf: "flex-start", marginLeft: 4 },
  urgencyBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.peachDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14, marginLeft: 4 },
  quickReplyPanel: { alignSelf: "flex-start", maxWidth: "92%", backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginLeft: 36, marginTop: 4, marginBottom: 12 },
  quickReplyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 9 },
  quickReplyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickReplyButton: { backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  quickReplyText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  composer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 18 : 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  recordingBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  recordingDotWrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center", marginRight: 6 },
  recordingPulse: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: colors.urgent },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.urgent },
  recordingText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5 },
  cancelTranscribeButton: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto", backgroundColor: colors.urgentDim, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  cancelTranscribeText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 13, marginBottom: 12 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkFaint },
  attachRail: { gap: 8, paddingBottom: 10, paddingHorizontal: 2 },
  attachChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12, paddingVertical: 8 },
  attachChipText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 11 },
  topicChipActive: { backgroundColor: colors.mintDim },
  topicChipTextActive: { color: colors.mint },
  deleteChip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.urgentDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, marginLeft: 2 },
  deleteChipText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 11, marginLeft: 6 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", backgroundColor: colors.bg, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 6, paddingVertical: 6, gap: 8 },
  micBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, maxHeight: 104, color: colors.ink, fontFamily: fonts.body, fontSize: 13, paddingTop: 9, paddingBottom: 9 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  locationBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end", padding: 16 },
  locationSheet: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  locationTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 17 },
  locationSub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  locationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationButton: { backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, paddingVertical: 10 },
  locationButtonText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  locationCancel: { alignItems: "center", paddingVertical: 13, marginTop: 10 },
  locationCancelText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
