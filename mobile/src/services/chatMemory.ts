import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { deleteChatMemoryRemote, fetchChatMemory, saveChatMemoryRemote, type ChatMemoryMessage } from "./api";

const CHAT_MEMORY_KEY = "remi_chat_memory";

export async function loadChatMemory(): Promise<ChatMemoryMessage[]> {
  const local = await readLocalChatMemory();
  if (local.length === 0) {
    try {
      const remote = await fetchChatMemory();
      if (remote.length > 0) await saveLocalChatMemory(remote);
      return remote;
    } catch {
      return local;
    }
  }

  fetchChatMemory()
    .then(async (remote) => {
      if (remote.length >= local.length) {
        await saveLocalChatMemory(remote);
      } else if (local.length > 0) {
        await saveChatMemoryRemote(local);
      }
    })
    .catch(() => undefined);
  return local;
}

export async function saveChatMemory(messages: ChatMemoryMessage[]) {
  await saveLocalChatMemory(messages);
  saveChatMemoryRemote(messages).catch(() => undefined);
}

export async function clearChatMemory() {
  await AsyncStorage.removeItem(CHAT_MEMORY_KEY);
  await SecureStore.deleteItemAsync(CHAT_MEMORY_KEY).catch(() => undefined);
  deleteChatMemoryRemote().catch(() => undefined);
}

async function readLocalChatMemory() {
  const asyncValue = await AsyncStorage.getItem(CHAT_MEMORY_KEY);
  if (asyncValue) return parseMessages(asyncValue);

  const legacyValue = await SecureStore.getItemAsync(CHAT_MEMORY_KEY);
  if (legacyValue) {
    await AsyncStorage.setItem(CHAT_MEMORY_KEY, legacyValue).catch(() => undefined);
    await SecureStore.deleteItemAsync(CHAT_MEMORY_KEY).catch(() => undefined);
    return parseMessages(legacyValue);
  }
  return [];
}

async function saveLocalChatMemory(messages: ChatMemoryMessage[]) {
  await AsyncStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(messages));
}

function parseMessages(value: string): ChatMemoryMessage[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
