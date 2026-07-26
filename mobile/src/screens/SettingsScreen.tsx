import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  Accessibility,
  ArrowLeft,
  Bell,
  ChevronRight,
  Database,
  FileText,
  HelpCircle,
  LogOut,
  Moon,
  Shield,
  User,
} from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { useAppLock } from "../hooks/useAppLock";
import { supabase } from "../services/supabaseClient";
import {
  cancelDentalVisionReminder,
  cancelHydrationReminder,
  requestNotificationPermissions,
  scheduleDentalVisionReminder,
  scheduleHydrationReminder,
  scheduleWeeklyVitalsReminder,
} from "../services/notifications";

const PROFILE_KEY = "remi_profile";
const QUIET_HOURS_KEY = "remi_quiet_hours";
const LARGE_TEXT_KEY = "remi_large_text";
const ANALYTICS_KEY = "remi_analytics_enabled";

type Profile = { name: string; phone: string; email: string };

const defaultProfile: Profile = { name: "Ama Owusu", phone: "", email: "" };

export default function SettingsScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [quietHours, setQuietHours] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [hydration, setHydration] = useState(false);
  const [preventive, setPreventive] = useState(false);
  const { lockEnabled, enableLock, disableLock } = useAppLock();

  useEffect(() => {
    (async () => {
      const storedProfile = await SecureStore.getItemAsync(PROFILE_KEY);
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      setQuietHours((await SecureStore.getItemAsync(QUIET_HOURS_KEY)) === "true");
      setLargeText((await SecureStore.getItemAsync(LARGE_TEXT_KEY)) === "true");
      setAnalytics((await SecureStore.getItemAsync(ANALYTICS_KEY)) === "true");
      setHydration(!!(await SecureStore.getItemAsync("remi_hydration_reminder_ids")));
      setPreventive(!!(await SecureStore.getItemAsync("remi_dental_vision_reminder_id")));
    })();
  }, []);

  const updateProfile = async (key: keyof Profile, value: string) => {
    const next = { ...profile, [key]: value };
    setProfile(next);
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(next));
  };

  const toggleStored = async (value: boolean, setter: (next: boolean) => void, key: string) => {
    setter(value);
    if (value) await SecureStore.setItemAsync(key, "true");
    else await SecureStore.deleteItemAsync(key);
  };

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) await scheduleWeeklyVitalsReminder();
      else setReminders(false);
    }
  };

  const toggleHydration = async (value: boolean) => {
    setHydration(value);
    if (value) await scheduleHydrationReminder();
    else await cancelHydrationReminder();
  };

  const togglePreventive = async (value: boolean) => {
    setPreventive(value);
    if (value) await scheduleDentalVisionReminder();
    else await cancelDentalVisionReminder();
  };

  const toggleLock = async (value: boolean) => {
    if (value) await enableLock();
    else await disableLock();
  };

  const signOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase?.auth.signOut();
          await SecureStore.deleteItemAsync("remi_session_token");
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
      </View>
      <ScreenHeader title="Settings" subtitle="Manage your Remi account, privacy, and reminders" />
      <View style={styles.content}>
        <Section icon={<User size={17} color={colors.primary} />} title="Profile">
          <Input label="Display name" value={profile.name} onChangeText={(value) => updateProfile("name", value)} />
          <Input label="Phone number" value={profile.phone} onChangeText={(value) => updateProfile("phone", value)} keyboardType="phone-pad" />
          <Input label="Email" value={profile.email} onChangeText={(value) => updateProfile("email", value)} keyboardType="email-address" />
        </Section>

        <Section icon={<Bell size={17} color={colors.primary} />} title="Notifications">
          <ToggleRow label="Health reminders" detail="Medication, vitals, and care nudges" value={reminders} onValueChange={toggleReminders} />
          <ToggleRow label="Hydration reminders" detail="Morning and afternoon check-ins" value={hydration} onValueChange={toggleHydration} />
          <ToggleRow label="Preventive care reminders" detail="Dental and vision planning" value={preventive} onValueChange={togglePreventive} />
          <ToggleRow label="Quiet hours" detail="Reduce non-urgent alerts overnight" value={quietHours} onValueChange={(v) => toggleStored(v, setQuietHours, QUIET_HOURS_KEY)} />
        </Section>

        <Section icon={<Shield size={17} color={colors.primary} />} title="Privacy and safety">
          <ToggleRow label="App lock" detail="Require Face ID, fingerprint, or passcode" value={lockEnabled} onValueChange={toggleLock} />
          <NavRow label="Emergency information" detail="Blood type, allergies, medication, contacts" onPress={() => navigation.navigate("EmergencySettings")} />
          <NavRow label="Privacy policy" detail="How Remi handles health information" />
        </Section>

        <Section icon={<Accessibility size={17} color={colors.primary} />} title="Accessibility">
          <ToggleRow label="Larger text" detail="Use roomier app text where supported" value={largeText} onValueChange={(v) => toggleStored(v, setLargeText, LARGE_TEXT_KEY)} />
          <ToggleRow label="Dark appearance" detail="Coming soon" value={false} onValueChange={() => {}} disabled icon={<Moon size={15} color={colors.inkFaint} />} />
        </Section>

        <Section icon={<Database size={17} color={colors.primary} />} title="Data">
          <ToggleRow label="Share app diagnostics" detail="Help improve reliability without symptom text" value={analytics} onValueChange={(v) => toggleStored(v, setAnalytics, ANALYTICS_KEY)} />
          <NavRow label="Export health data" detail="Prepare a copy of your saved records" />
          <NavRow label="Delete account data" detail="Request removal of Remi data" destructive />
        </Section>

        <Section icon={<HelpCircle size={17} color={colors.primary} />} title="Support">
          <NavRow label="Help center" detail="Guides, FAQs, and contact options" />
          <NavRow label="Terms of service" detail="App usage terms" icon={<FileText size={15} color={colors.inkFaint} />} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Remi version</Text>
            <Text style={styles.aboutValue}>0.1.0</Text>
          </View>
        </Section>

        <Pressable onPress={signOut} style={styles.signOutButton}>
          <LogOut size={16} color={colors.urgent} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Input({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" | "phone-pad" }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkFaint} style={styles.input} autoCapitalize="none" {...props} />
    </View>
  );
}

function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
  disabled,
  icon,
}: {
  label: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.48 }]}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ false: colors.hairline, true: colors.primaryDim }} thumbColor={value ? colors.primary : colors.surface} />
    </View>
  );
}

function NavRow({ label, detail, onPress, destructive, icon }: { label: string; detail: string; onPress?: () => void; destructive?: boolean; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && { color: colors.urgent }]}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <ChevronRight size={16} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.xl, paddingTop: 54, marginBottom: -6 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.xl, gap: 14 },
  section: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  inputWrap: { marginBottom: 10 },
  inputLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5, marginBottom: 6 },
  input: { backgroundColor: colors.bg, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12, paddingVertical: 11, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5 },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingVertical: 12 },
  rowIcon: { marginRight: 10 },
  rowCopy: { flex: 1, paddingRight: 12 },
  rowLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  rowDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  aboutRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  aboutLabel: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  aboutValue: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 12 },
  signOutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.urgentDim, borderRadius: 999, paddingVertical: 15, marginTop: 2 },
  signOutText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
