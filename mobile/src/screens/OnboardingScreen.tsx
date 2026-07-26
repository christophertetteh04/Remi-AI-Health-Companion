import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import { Check, Lock } from "lucide-react-native";
import { useAppLock } from "../hooks/useAppLock";

// No splash/branding screen — this is the very first screen the user sees.
export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const { enableLock } = useAppLock();
  const [lockOn, setLockOn] = useState(false);

  const finish = async () => {
    if (lockOn) await enableLock();
    await SecureStore.setItemAsync("remi_onboarded", "true");
    navigation.replace("Main");
  };

  if (step === 0) {
    return (
      <View style={styles.container}>
        <View>
          <Text style={styles.h1}>A daily companion,{"\n"}quietly with you.</Text>
          <Text style={styles.body}>Talk through symptoms, understand your labs, and never miss a dose.</Text>
        </View>
        <View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Not a medical device — doesn't diagnose or treat. Always consult a licensed doctor.
            </Text>
          </View>
          <PrimaryButton title="Get started" onPress={() => setStep(1)} />
        </View>
      </View>
    );
  }

  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.h1Small}>A few quick things</Text>
        <TextInput placeholder="Full name" placeholderTextColor={colors.inkFaint} value={name} onChangeText={setName} style={styles.input} />
        <TextInput placeholder="Phone number" placeholderTextColor={colors.inkFaint} value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        <View style={{ flex: 1 }} />
        <PrimaryButton title="Continue" onPress={() => setStep(2)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1Small}>Before we begin</Text>
      {[
        { v: consent, set: setConsent, text: "I agree that my health information will be stored to provide this service." },
        { v: terms, set: setTerms, text: "I've read and accept the Terms of Service and Privacy Policy." },
      ].map((row, i) => (
        <Pressable key={i} onPress={() => row.set(!row.v)} style={styles.checkRow}>
          <View style={[styles.checkbox, row.v && { backgroundColor: colors.primary }]}>
            {row.v && <Check size={12} color={colors.bg} />}
          </View>
          <Text style={styles.checkText}>{row.text}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setLockOn(!lockOn)} style={styles.checkRow}>
        <View style={[styles.checkbox, lockOn && { backgroundColor: colors.primary }]}>
          {lockOn && <Check size={12} color={colors.bg} />}
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <Lock size={14} color={colors.inkSoft} style={{ marginRight: 8 }} />
          <Text style={styles.checkText}>Require Face ID / fingerprint / passcode to open Remi</Text>
        </View>
      </Pressable>
      <View style={{ flex: 1 }} />
      <PrimaryButton title="Create my account" onPress={finish} style={{ opacity: consent && terms ? 1 : 0.4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 32, paddingTop: 64, paddingBottom: 36, justifyContent: "space-between" },
  h1: { color: colors.ink, fontFamily: fonts.displayItalic, fontSize: 36, lineHeight: 42 },
  h1Small: { color: colors.ink, fontFamily: fonts.displayItalic, fontSize: 28, marginBottom: 20 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14.5, marginTop: 16, lineHeight: 21 },
  disclaimer: { backgroundColor: colors.peachDim, borderRadius: 18, padding: 14, marginBottom: 18 },
  disclaimerText: { color: "#F0D2B8", fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  input: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14, marginBottom: 10 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 },
  checkText: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
});
