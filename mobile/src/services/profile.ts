import * as SecureStore from "expo-secure-store";

export const PROFILE_KEY = "remi_profile";

export type Profile = {
  name: string;
  preferredName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  language: string;
  ageGroup: string;
  healthFocus: string;
  city: string;
  country: string;
};

export const defaultProfile: Profile = {
  name: "",
  preferredName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  language: "",
  ageGroup: "",
  healthFocus: "",
  city: "",
  country: "",
};

export async function loadProfile() {
  const stored = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!stored) return defaultProfile;
  return { ...defaultProfile, ...JSON.parse(stored) };
}

export async function saveProfile(profile: Profile) {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}
