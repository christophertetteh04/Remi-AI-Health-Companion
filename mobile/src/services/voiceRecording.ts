import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { isLowBandwidthModeEnabled } from "./network";
import { analyticsRequestHeader } from "./posthog";
import { getFreshAccessToken } from "./api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

const VOICE_NOTE_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 32000,
  },
};

let recording: Audio.Recording | null = null;
let transcriptionController: AbortController | null = null;
let transcriptionCanceled = false;

export async function startRecording(): Promise<{ started: boolean; error?: string }> {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return { started: false, error: "Microphone permission is needed to record a voice check-in." };

    if (recording) {
      await recording.stopAndUnloadAsync().catch(() => {});
      recording = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { recording: rec } = await Audio.Recording.createAsync(VOICE_NOTE_OPTIONS);
    recording = rec;
    return { started: true };
  } catch {
    recording = null;
    return { started: false, error: "Couldn't start recording. Please check microphone access and try again." };
  }
}

export async function stopRecordingAndTranscribe(): Promise<{ text: string; error?: string }> {
  if (!recording) return { text: "", error: "No active recording." };
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    recording = null;
    return { text: "", error: "Recording stopped unexpectedly. Please try again." };
  }
  const uri = recording.getURI();
  recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  if (!uri) return { text: "", error: "Recording failed to save." };

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && typeof info.size === "number" && info.size > 6_000_000) {
    return { text: "", error: "That recording is too long — please try a shorter voice note." };
  }
  const mimeType = mimeTypeForUri(uri);
  const token = await getFreshAccessToken();
  if (!token) return { text: "", error: "Please sign in again before using voice notes." };
  const formData = new FormData();
  formData.append("file", { uri, name: fileNameForMimeType(mimeType), type: mimeType } as any);

  transcriptionCanceled = false;
  const controller = new AbortController();
  transcriptionController = controller;
  const timeoutMs = (await isLowBandwidthModeEnabled()) ? 45000 : 30000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/speech/transcribe-file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...(await analyticsRequestHeader()) },
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = "";
      try {
        const body = await res.json();
        message = typeof body?.message === "string" ? body.message : "";
      } catch {}
      throw new Error(message || `Transcription failed (${res.status})`);
    }
    const data = await res.json();
    return { text: data?.text || "", error: data?.error };
  } catch (error: any) {
    if (transcriptionCanceled) return { text: "", error: "Transcription canceled." };
    console.log("Voice transcription error:", error?.message || String(error));
    return { text: "", error: "Couldn't transcribe that recording just now — please try again or type instead." };
  } finally {
    clearTimeout(timeout);
    transcriptionController = null;
  }
}

export function cancelRecording() {
  if (recording) {
    recording.stopAndUnloadAsync().catch(() => {});
    recording = null;
  }
  Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
}

export function cancelTranscription() {
  transcriptionCanceled = true;
  transcriptionController?.abort();
  transcriptionController = null;
}

function mimeTypeForUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".3gp") || lower.endsWith(".3gpp")) return "audio/3gpp";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".mp4")) return "audio/mp4";
  return "audio/m4a";
}

function fileNameForMimeType(mimeType: string) {
  if (mimeType === "audio/wav") return "checkin.wav";
  if (mimeType === "audio/webm") return "checkin.webm";
  if (mimeType === "audio/3gpp") return "checkin.3gp";
  if (mimeType === "audio/aac") return "checkin.aac";
  if (mimeType === "audio/mp4") return "checkin.mp4";
  return "checkin.m4a";
}
