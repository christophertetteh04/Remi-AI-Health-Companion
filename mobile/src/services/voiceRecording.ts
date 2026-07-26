import { Audio } from "expo-av";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) return false;

  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  recording = rec;
  return true;
}

export async function stopRecordingAndTranscribe(): Promise<{ text: string; error?: string }> {
  if (!recording) return { text: "", error: "No active recording." };
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;
  if (!uri) return { text: "", error: "Recording failed to save." };

  const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const token = await SecureStore.getItemAsync("remi_session_token");

  try {
    const res = await fetch(`${API_BASE_URL}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ audioBase64 }),
    });
    return res.json();
  } catch {
    return { text: "", error: "Couldn't reach the server — please type instead." };
  }
}

export function cancelRecording() {
  if (recording) {
    recording.stopAndUnloadAsync().catch(() => {});
    recording = null;
  }
}
