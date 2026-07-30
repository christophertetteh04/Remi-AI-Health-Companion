import * as SecureStore from "expo-secure-store";

export const LOW_BANDWIDTH_MODE_KEY = "remi_low_bandwidth_mode";

export async function isLowBandwidthModeEnabled() {
  return (await SecureStore.getItemAsync(LOW_BANDWIDTH_MODE_KEY)) === "true";
}

export async function setLowBandwidthModeEnabled(enabled: boolean) {
  await SecureStore.setItemAsync(LOW_BANDWIDTH_MODE_KEY, enabled ? "true" : "false");
}
