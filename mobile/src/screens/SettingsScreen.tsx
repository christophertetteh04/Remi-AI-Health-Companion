import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  Accessibility,
  ArrowLeft,
  Bell,
  BellOff,
  CalendarCheck,
  ChevronRight,
  Database,
  Droplets,
  Edit3,
  FileText,
  HelpCircle,
  LockKeyhole,
  LogOut,
  Moon,
  Shield,
  User,
} from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { useAppLock } from "../hooks/useAppLock";
import { supabase } from "../services/supabaseClient";
import { defaultProfile, loadProfile, Profile } from "../services/profile";
import {
  HEALTH_REMINDERS_ENABLED_KEY,
  HYDRATION_ENABLED_KEY,
  PREVENTIVE_CARE_ENABLED_KEY,
  QUIET_HOURS_ENABLED_KEY,
} from "../services/notifications";
import { ANALYTICS_KEY, setAnalyticsEnabled } from "../services/posthog";
import { DARK_APPEARANCE_KEY, LARGE_TEXT_KEY, setDarkAppearanceEnabled, setLargeTextEnabled } from "../services/largeText";
import { clearSessionTokens } from "../services/api";

export default function SettingsScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [quietHours, setQuietHours] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [darkAppearance, setDarkAppearance] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [hydration, setHydration] = useState(false);
  const [preventive, setPreventive] = useState(false);
  const { lockEnabled } = useAppLock();

  useEffect(() => {
    (async () => {
      setProfile(await loadProfile());
      setQuietHours((await SecureStore.getItemAsync(QUIET_HOURS_ENABLED_KEY)) === "true");
      setLargeText((await SecureStore.getItemAsync(LARGE_TEXT_KEY)) === "true");
      setDarkAppearance((await SecureStore.getItemAsync(DARK_APPEARANCE_KEY)) === "true");
      setAnalytics((await SecureStore.getItemAsync(ANALYTICS_KEY)) !== "false");
      setReminders((await SecureStore.getItemAsync(HEALTH_REMINDERS_ENABLED_KEY)) === "true");
      setHydration((await SecureStore.getItemAsync(HYDRATION_ENABLED_KEY)) === "true");
      setPreventive((await SecureStore.getItemAsync(PREVENTIVE_CARE_ENABLED_KEY)) === "true");
    })();
    const unsubscribe = navigation.addListener("focus", async () => {
      setProfile(await loadProfile());
      setReminders((await SecureStore.getItemAsync(HEALTH_REMINDERS_ENABLED_KEY)) === "true");
      setHydration((await SecureStore.getItemAsync(HYDRATION_ENABLED_KEY)) === "true");
      setQuietHours((await SecureStore.getItemAsync(QUIET_HOURS_ENABLED_KEY)) === "true");
      setPreventive((await SecureStore.getItemAsync(PREVENTIVE_CARE_ENABLED_KEY)) === "true");
    });
    return unsubscribe;
  }, [navigation]);

  const toggleAnalytics = async (value: boolean) => {
    setAnalytics(value);
    await setAnalyticsEnabled(value);
  };

  const toggleLargeText = async (value: boolean) => {
    setLargeText(value);
    await setLargeTextEnabled(value);
  };

  const toggleDarkAppearance = async (value: boolean) => {
    await setDarkAppearanceEnabled(value);
    setDarkAppearance(value);
  };

  const signOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await supabase?.auth.signOut();
          await clearSessionTokens();
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
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initials(profile.name || profile.preferredName || "R")}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{profile.name || "Add your name"}</Text>
              <Text style={styles.profileMeta}>{[profile.phone || "Phone not added", profile.email || "Email not added"].join("  |  ")}</Text>
              <Text style={styles.profileMeta}>{[profile.language || "Language not set", profile.city || profile.country ? [profile.city, profile.country].filter(Boolean).join(", ") : "Location not set"].join("  |  ")}</Text>
              {profile.ageGroup ? <Text style={styles.profileFocus}>{profile.ageGroup}: {profile.healthFocus}</Text> : null}
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate("ProfileEdit")} style={styles.editProfileButton}>
            <Edit3 size={15} color={colors.primary} />
            <Text style={styles.editProfileText}>Edit profile information</Text>
            <ChevronRight size={15} color={colors.primary} />
          </Pressable>
        </Section>

        <Section icon={<Bell size={17} color={colors.primary} />} title="Notifications">
          <NavRow label="Health reminders" detail={reminders ? "On: weekly health nudges selected" : "Choose vitals, check-in, or medication review nudges"} icon={<Bell size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("HealthReminderSettings")} />
          <NavRow label="Hydration reminders" detail={hydration ? "On: daily water reminders selected" : "Choose daily water reminder times"} icon={<Droplets size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("HydrationReminderSettings")} />
          <NavRow label="Preventive care reminders" detail={preventive ? "On: dental, vision, or check-up nudges" : "Choose routine care reminder options"} icon={<CalendarCheck size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("PreventiveReminderSettings")} />
          <NavRow label="Quiet hours" detail={quietHours ? "On: routine alerts are quiet overnight" : "Choose when routine alerts stay quiet"} icon={<BellOff size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("QuietHoursSettings")} />
        </Section>

        <Section icon={<Shield size={17} color={colors.primary} />} title="Privacy and safety">
          <NavRow label="App lock" detail={lockEnabled ? "On: device unlock required" : "Choose Face ID, fingerprint, or passcode"} icon={<LockKeyhole size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("AppLockSettings")} />
          <NavRow label="Emergency information" detail="Blood type, allergies, medication, contacts" onPress={() => navigation.navigate("EmergencySettings")} />
          <NavRow label="Privacy policy" detail="How Remi handles health information" onPress={() => navigation.navigate("PrivacyPolicy")} />
        </Section>

        <Section icon={<Accessibility size={17} color={colors.primary} />} title="Accessibility">
          <ToggleRow label="Larger text" detail="Increase text size across Remi" value={largeText} onValueChange={toggleLargeText} />
          <ToggleRow label="Dark appearance" detail="Use a darker, lower-glare interface" value={darkAppearance} onValueChange={toggleDarkAppearance} icon={<Moon size={15} color={colors.inkFaint} />} />
        </Section>

        <Section icon={<Database size={17} color={colors.primary} />} title="Data">
          <ToggleRow label="Share product analytics" detail="Uses PostHog event counts only; no chat, lab, or medication text" value={analytics} onValueChange={toggleAnalytics} />
          <NavRow label="Export health data" detail="Prepare a copy of your saved records" onPress={() => navigation.navigate("ExportHealthData")} />
          <NavRow label="Delete account data" detail="Permanently remove your Remi records" destructive onPress={() => navigation.navigate("DeleteAccountData")} />
        </Section>

        <Section icon={<HelpCircle size={17} color={colors.primary} />} title="Support">
          <NavRow label="Help center" detail="Guides, FAQs, and contact options" onPress={() => navigation.navigate("HelpCenter")} />
          <NavRow label="Terms of service" detail="App usage terms" icon={<FileText size={15} color={colors.inkFaint} />} onPress={() => navigation.navigate("TermsOfService")} />
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
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceRaised, true: colors.primaryDim }}
        thumbColor={value ? colors.primary : colors.inkFaint}
        ios_backgroundColor={colors.surfaceRaised}
      />
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.xl, paddingTop: 54, marginBottom: -6 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.xl, gap: 14 },
  section: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  profileAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12 },
  profileAvatarText: { color: colors.bg, fontFamily: fonts.display, fontSize: 17 },
  profileCopy: { flex: 1 },
  profileName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  profileMeta: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  profileFocus: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  editProfileButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primaryDim, borderRadius: 999, marginTop: 12 },
  editProfileText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
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
