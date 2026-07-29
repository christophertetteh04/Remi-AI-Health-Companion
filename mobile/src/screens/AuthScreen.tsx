import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, GhostButton } from "../components/UI";
import { showRemiToast } from "../components/RemiToast";
import { saveSessionTokens } from "../services/api";
import { supabase, supabaseConfigError } from "../services/supabaseClient";
import { restoreAccountDataIfNeeded } from "../services/accountRecovery";
import { trackEvent } from "../services/posthog";
import { Check, HeartPulse, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react-native";

const REMEMBER_EMAIL_KEY = "remi_remembered_email";
const REMEMBER_ME_KEY = "remi_remember_me";

// Beginner note: Supabase Auth runs directly between the phone and
// Supabase — the backend never sees the password, only the resulting
// session token, which we store securely and attach to API calls.
export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadRememberedEmail = async () => {
      const remembered = (await SecureStore.getItemAsync(REMEMBER_ME_KEY)) === "true";
      const rememberedEmail = await SecureStore.getItemAsync(REMEMBER_EMAIL_KEY);
      setRememberMe(remembered);
      if (remembered && rememberedEmail) {
        setEmail(rememberedEmail);
        setMode("signin");
      }
    };

    loadRememberedEmail();
  }, []);

  const showRequiredDetailsToast = () => {
    showRemiToast("Almost there", "Please complete the required details before continuing.");
  };

  const submit = async () => {
    setError("");
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      showRequiredDetailsToast();
      return;
    }

    setLoading(true);
    if (!supabase) {
      setLoading(false);
      setError(supabaseConfigError || "Supabase is not configured.");
      return;
    }
    try {
      const credentials = { email: cleanEmail, password };
      const { data, error: authError } =
        mode === "signup"
          ? await supabase.auth.signUp(credentials)
          : await supabase.auth.signInWithPassword(credentials);

      console.log("Auth result:", JSON.stringify({ mode, hasSession: !!data.session, hasUser: !!data.user, error: authError?.message }));
      setLoading(false);

      if (authError) {
        setError(authError.message);
        return;
      }
      if (rememberMe) {
        await SecureStore.setItemAsync(REMEMBER_ME_KEY, "true");
        await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, cleanEmail);
      } else {
        await SecureStore.deleteItemAsync(REMEMBER_ME_KEY);
        await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
      }
      if (data.session?.access_token) {
        await saveSessionTokens(data.session);
        if (mode === "signup") await trackEvent("signup_completed");
        const restored = await restoreAccountDataIfNeeded();
        if (restored) {
          // A returning user on a new device — their account already
          // completed onboarding before, so don't make them redo it.
          await SecureStore.setItemAsync("remi_onboarded", "true");
          navigation.replace("Main");
        } else {
          navigation.replace("Onboarding");
        }
      } else if (mode === "signup") {
        setError("Check your email to confirm your account, then sign in.");
      }
    } catch (err: any) {
      console.log("Auth exception:", err?.message || String(err));
      setLoading(false);
      setError(err?.message || "Signup failed. Check your connection and Supabase settings.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.logoMark}>
              <HeartPulse size={28} color={colors.bg} />
            </View>
            <View style={styles.securePill}>
              <ShieldCheck size={13} color={colors.mint} />
              <Text style={styles.secureText}>Private by design</Text>
            </View>
          </View>
          <View style={{ paddingTop: 15, paddingBottom: 15 }}></View>
          {/*<View style={styles.visualPanel}>
            <View style={styles.visualCardLarge}>
              <View style={styles.visualLine} />
              <View style={[styles.visualLine, { width: "64%" }]} />
              <View style={styles.vitalsRow}>
                <View style={styles.vitalBlock}>
                  <Text style={styles.vitalLabel}>BP</Text>
                  <Text style={styles.vitalValue}>118/76</Text>
                </View>
                <View style={styles.vitalBlock}>
                  <Text style={styles.vitalLabel}>Dose</Text>
                  <Text style={styles.vitalValue}>2 PM</Text>
                </View>
              </View>
            </View>
            <View style={styles.sparkBadge}>
              <Sparkles size={16} color={colors.peach} />
            </View>
          </View>*/}
          <Text style={styles.eyebrow}>REMI HEALTH COMPANION</Text>
          <Text style={styles.h1}>{mode === "signup" ? "Start with a calmer way to manage your health." : "Welcome back to your health space."}</Text>
          <Text style={styles.subtitle}>Track symptoms, medications, labs, and care reminders in one secure place.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.modeSwitch}>
            <Pressable onPress={() => setMode("signup")} style={[styles.modeButton, mode === "signup" && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === "signup" && styles.modeTextActive]}>Create account</Text>
            </Pressable>
            <Pressable onPress={() => setMode("signin")} style={[styles.modeButton, mode === "signin" && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === "signin" && styles.modeTextActive]}>Sign in</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor={colors.inkFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          {mode === "signin" ? (
            <Pressable onPress={() => setRememberMe((value) => !value)} style={styles.rememberRow}>
              <View style={[styles.rememberBox, rememberMe && styles.rememberBoxActive]}>
                {rememberMe ? <Check size={12} color={colors.bg} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rememberTitle}>Remember me</Text>
                {/* <Text style={styles.rememberText}>Save this email on this device. Remi never stores your password.</Text> */}
              </View>
            </Pressable>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title={loading ? "Please wait…" : mode === "signup" ? "Create secure account" : "Sign in securely"} onPress={submit} />
          <View style={styles.lockNote}>
            {/* <LockKeyhole size={13} color={colors.inkFaint} />
            <Text style={styles.lockText}>Your session token is stored securely on this device.</Text> */}
          </View>
        </View>

        <GhostButton
          title={mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 58, paddingBottom: 30 },
  hero: { marginBottom: 18 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  securePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.mintDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  secureText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  visualPanel: { height: 132, marginTop: 22, marginBottom: 20, justifyContent: "center" },
  visualCardLarge: { height: 118, backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, justifyContent: "space-between", shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  visualLine: { width: "82%", height: 10, borderRadius: 5, backgroundColor: colors.surfaceRaised },
  vitalsRow: { flexDirection: "row", gap: 10 },
  vitalBlock: { flex: 1, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  vitalLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5 },
  vitalValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15, marginTop: 2 },
  sparkBadge: { position: "absolute", right: 18, top: 4, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 8 },
  h1: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 35 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 10 },
  formCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  modeSwitch: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 999, padding: 4, marginBottom: 16 },
  modeButton: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 10 },
  modeButtonActive: { backgroundColor: colors.surface, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  modeText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12.5 },
  modeTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 7 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  rememberRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 12 },
  rememberBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1, backgroundColor: colors.surface },
  rememberBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  rememberText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  error: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, marginTop: 4 },
  lockNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  lockText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, flex: 1 },
});
