import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import { Check, HeartPulse, Lock, ShieldCheck, Sparkles, UserRound } from "lucide-react-native";
import { useAppLock } from "../hooks/useAppLock";
import { trackEvent } from "../services/posthog";

const onboardingImage = require("../../assets/images/onboarding-health-companion.jpg");

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const { enableLock } = useAppLock();
  const [lockOn, setLockOn] = useState(false);

  const finish = async () => {
    if (!consent || !terms) return;
    if (lockOn) await enableLock();
    await SecureStore.setItemAsync("remi_profile", JSON.stringify({ name: name.trim(), phone: phone.trim(), email: "" }));
    await SecureStore.setItemAsync("remi_onboarded", "true");
    await trackEvent("onboarding_completed");
    navigation.replace("Welcome");
  };

  const StepDots = () => (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
      ))}
    </View>
  );

  if (step === 0) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
        <StepDots />
        <View style={styles.heroImageWrap}>
          <Image source={onboardingImage} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.floatingBadge}>
            <Sparkles size={15} color={colors.peach} />
            <Text style={styles.floatingBadgeText}>Personal health companion</Text>
          </View>
        </View>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>WELCOME TO REMI</Text>
          <Text style={styles.h1}>Care reminders, symptoms, labs, and safety in one calm place.</Text>
          <Text style={styles.body}>Remi helps you keep track of what matters, prepare for appointments, and understand your records without the clutter.</Text>
        </View>
        <View style={styles.featureRow}>
          {[
            { icon: HeartPulse, label: "Daily check-ins" },
            { icon: ShieldCheck, label: "Private records" },
            { icon: Lock, label: "Device lock" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.label} style={styles.featurePill}>
                <Icon size={14} color={colors.primary} />
                <Text style={styles.featureText}>{item.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.bottomActions}>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>Remi is not a medical device and does not diagnose or treat. Always consult a licensed clinician.</Text>
          </View>
          <PrimaryButton title="Get started" onPress={() => setStep(1)} />
        </View>
      </ScrollView>
    );
  }

  if (step === 1) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <StepDots />
          <View style={styles.topIcon}>
            <UserRound size={28} color={colors.primary} />
          </View>
          <Text style={styles.h1Small}>Personalize your Remi space</Text>
          <Text style={styles.body}>Your name helps Remi greet you properly and keep your dashboard feeling like yours.</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Full name</Text>
            <TextInput placeholder="e.g. Ama Owusu" placeholderTextColor={colors.inkFaint} value={name} onChangeText={setName} style={styles.input} />
            <Text style={styles.label}>Phone number</Text>
            <TextInput placeholder="+233 ..." placeholderTextColor={colors.inkFaint} value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
          </View>
          <View style={styles.bottomActions}>
            <PrimaryButton title="Continue" onPress={() => setStep(2)} />
            <Pressable onPress={() => setStep(0)} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <StepDots />
      <View style={styles.topIcon}>
        <ShieldCheck size={30} color={colors.primary} />
      </View>
      <Text style={styles.h1Small}>Privacy before anything else</Text>
      <Text style={styles.body}>Confirm how your health information is stored and choose whether Remi should require device unlock.</Text>
      <View style={styles.formCard}>
        {[
          { v: consent, set: setConsent, text: "I agree that my health information will be stored to provide this service." },
          { v: terms, set: setTerms, text: "I've read and accept the Terms of Service and Privacy Policy." },
        ].map((row, i) => (
          <Pressable key={i} onPress={() => row.set(!row.v)} style={styles.checkRow}>
            <View style={[styles.checkbox, row.v && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {row.v && <Check size={12} color={colors.bg} />}
            </View>
            <Text style={styles.checkText}>{row.text}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setLockOn(!lockOn)} style={[styles.checkRow, { marginBottom: 0 }]}>
          <View style={[styles.checkbox, lockOn && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            {lockOn && <Check size={12} color={colors.bg} />}
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Lock size={14} color={colors.inkSoft} style={{ marginRight: 8 }} />
            <Text style={styles.checkText}>Require Face ID / fingerprint / passcode to open Remi</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.bottomActions}>
        <PrimaryButton title="Create my account" onPress={finish} style={{ opacity: consent && terms ? 1 : 0.4 }} />
        <Pressable onPress={() => setStep(1)} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  dots: { flexDirection: "row", alignSelf: "center", gap: 7, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.hairline },
  dotActive: { width: 22, backgroundColor: colors.primary },
  heroImageWrap: {
    height: 270,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroImage: { width: "100%", height: "100%" },
  floatingBadge: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  floatingBadgeText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  copyBlock: { marginTop: 24 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 8 },
  h1: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 37 },
  h1Small: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 35, marginTop: 18 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, marginTop: 12, lineHeight: 21 },
  featureRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12, paddingVertical: 9 },
  featureText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 11.5 },
  topIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  formCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginTop: 22 },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 7 },
  disclaimer: { backgroundColor: colors.peachDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  disclaimerText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 },
  checkText: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  bottomActions: { marginTop: "auto", paddingTop: 24 },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
