import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, GhostButton } from "../components/UI";
import { supabase, supabaseConfigError } from "../services/supabaseClient";
import { restoreAccountDataIfNeeded } from "../services/accountRecovery";

// Beginner note: Supabase Auth runs directly between the phone and
// Supabase — the backend never sees the password, only the resulting
// session token, which we store securely and attach to API calls.
export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    if (!supabase) {
      setLoading(false);
      setError(supabaseConfigError || "Supabase is not configured.");
      return;
    }
    try {
      const credentials = { email: email.trim(), password };
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
      if (data.session?.access_token) {
        await SecureStore.setItemAsync("remi_session_token", data.session.access_token);
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
    <View style={styles.container}>
      <Text style={styles.h1}>{mode === "signup" ? "Create your account" : "Welcome back"}</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.inkFaint}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.inkFaint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ flex: 1 }} />
      <PrimaryButton title={loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"} onPress={submit} />
      <View style={{ height: 10 }} />
      <GhostButton
        title={mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 32, paddingTop: 90, paddingBottom: 36 },
  h1: { color: colors.ink, fontFamily: fonts.display, fontSize: 27, marginBottom: 24 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  error: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, marginTop: 4 },
});
