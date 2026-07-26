import { Audio } from "expo-av";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

let recording: Audio.Recording | null = null;

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
    const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
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

  const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const token = await SecureStore.getItemAsync("remi_session_token");

  try {
    const res = await fetch(`${API_BASE_URL}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ audioBase64 }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { text: data?.text || "", error: data?.error };
  } catch {
    return { text: "", error: "Couldn't reach the server — please type instead." };
  }
}

export function cancelRecording() {
  if (recording) {
    recording.stopAndUnloadAsync().catch(() => {});
    recording = null;
  }
  Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
}
