import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Cloud,
  Database,
  Download,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { showRemiToast } from "../components/RemiToast";
import { ACCOUNT_BACKUP_LAST_SYNC_KEY, backupAccountDataNow } from "../services/accountRecovery";
import { ANALYTICS_KEY, setAnalyticsEnabled } from "../services/posthog";
import { loadChatMemory } from "../services/chatMemory";
import { getRecentActivities } from "../services/recentActivity";
import { isLowBandwidthModeEnabled, setLowBandwidthModeEnabled } from "../services/network";
import { LOCK_ENABLED_KEY, LOCK_PIN_KEY } from "../hooks/useAppLock";

export default function PrivacyDataDashboardScreen({ navigation }: any) {
  const [analytics, setAnalytics] = useState(true);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [chatCount, setChatCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [backupBusy, setBackupBusy] = useState(false);

  const loadState = useCallback(async () => {
    const [analyticsValue, lowBandwidthValue, lockValue, pinValue, backupValue, chats, activities] = await Promise.all([
      SecureStore.getItemAsync(ANALYTICS_KEY),
      isLowBandwidthModeEnabled(),
      SecureStore.getItemAsync(LOCK_ENABLED_KEY),
      SecureStore.getItemAsync(LOCK_PIN_KEY),
      SecureStore.getItemAsync(ACCOUNT_BACKUP_LAST_SYNC_KEY),
      loadChatMemory(),
      getRecentActivities(),
    ]);
    setAnalytics(analyticsValue !== "false");
    setLowBandwidth(lowBandwidthValue);
    setLockEnabled(lockValue === "true");
    setPinEnabled(Boolean(pinValue));
    setLastBackup(backupValue);
    setChatCount(chats.length);
    setActivityCount(activities.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState]),
  );

  const toggleAnalytics = async (value: boolean) => {
    setAnalytics(value);
    await setAnalyticsEnabled(value);
    showRemiToast("Privacy updated", value ? "Product analytics are on." : "Product analytics are off.", "bottom");
  };

  const toggleLowBandwidth = async (value: boolean) => {
    setLowBandwidth(value);
    await setLowBandwidthModeEnabled(value);
    showRemiToast("Connection mode updated", value ? "Remi will wait longer on slow networks." : "Standard network timing restored.", "bottom");
  };

  const runBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    const saved = await backupAccountDataNow();
    await loadState();
    setBackupBusy(false);
    showRemiToast(saved ? "Backup complete" : "Backup paused", saved ? "Your account backup is up to date." : "Remi will try again when the connection is stable.", "bottom");
  };

  const openNotificationPrivacy = () => {
    Alert.alert(
      "Private notification text",
      "Remi keeps reminder details generic on the lock screen. Open the app and unlock Remi to see health details.",
      [
        { text: "App lock", onPress: () => navigation.navigate("AppLockSettings") },
        { text: "Reminder settings", onPress: () => navigation.navigate("HealthReminderSettings") },
        { text: "Done", style: "cancel" },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <ShieldCheck size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Private</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Database size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>DATA CONTROL</Text>
        <Text style={styles.title}>Privacy & data dashboard</Text>
        <Text style={styles.subtitle}>Review what Remi keeps, protect shared-device access, and keep your account ready for weak connections.</Text>
      </View>

      <View style={styles.statusGrid}>
        <StatusCard icon={<LockKeyhole size={18} color={colors.primary} />} label="App lock" value={lockEnabled ? "On" : "Off"} detail={pinEnabled ? "PIN enabled" : "Device lock"} />
        <StatusCard icon={<Cloud size={18} color={colors.primary} />} label="Cloud backup" value={lastBackup ? "Synced" : "Not yet"} detail={formatBackupTime(lastBackup)} />
        <StatusCard icon={<Database size={18} color={colors.primary} />} label="Local memory" value={`${chatCount + activityCount}`} detail={`${chatCount} chats, ${activityCount} activities`} />
      </View>

      <Section title="Connection resilience">
        <ToggleRow
          icon={<Wifi size={17} color={colors.inkFaint} />}
          label="Low-bandwidth mode"
          detail="Longer server wait time, local-first saves, and quieter failure messages when the network is unstable."
          value={lowBandwidth}
          onValueChange={toggleLowBandwidth}
        />
        <ActionRow
          icon={<RefreshCw size={17} color={colors.inkFaint} />}
          label={backupBusy ? "Backing up..." : "Backup now"}
          detail={lastBackup ? `Last synced ${formatBackupTime(lastBackup)}` : "Save your local Remi records to your account"}
          onPress={runBackup}
          disabled={backupBusy}
        />
      </Section>

      <Section title="Privacy controls">
        <ActionRow icon={<LockKeyhole size={17} color={colors.inkFaint} />} label="App lock" detail={lockEnabled ? "Manage biometric lock or Remi PIN" : "Add biometric lock or Remi PIN"} onPress={() => navigation.navigate("AppLockSettings")} />
        <ActionRow icon={<Bell size={17} color={colors.inkFaint} />} label="Private notification text" detail="Routine reminders use generic wording on the lock screen." onPress={openNotificationPrivacy} />
        <ToggleRow icon={<BarChart3 size={17} color={colors.inkFaint} />} label="Product analytics" detail="No chat, lab, medication, or symptom text is shared." value={analytics} onValueChange={toggleAnalytics} />
      </Section>

      <Section title="Data access">
        <ActionRow icon={<Download size={17} color={colors.inkFaint} />} label="Export health data" detail="Prepare a copy of saved Remi records" onPress={() => navigation.navigate("ExportHealthData")} />
        <ActionRow icon={<ShieldCheck size={17} color={colors.inkFaint} />} label="Privacy policy" detail="How Remi handles health information" onPress={() => navigation.navigate("PrivacyPolicy")} />
        <ActionRow icon={<Trash2 size={17} color={colors.urgent} />} label="Delete account data" detail="Permanently remove your Remi records" destructive onPress={() => navigation.navigate("DeleteAccountData")} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function StatusCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIcon}>{icon}</View>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusDetail} numberOfLines={2}>{detail}</Text>
    </View>
  );
}

function ToggleRow({ icon, label, detail, value, onValueChange }: { icon: React.ReactNode; label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.surfaceRaised, true: colors.primaryDim }} thumbColor={value ? colors.primary : colors.inkFaint} />
    </View>
  );
}

function ActionRow({ icon, label, detail, onPress, destructive, disabled }: { icon: React.ReactNode; label: string; detail: string; onPress: () => void; destructive?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.row, disabled && { opacity: 0.52 }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && { color: colors.urgent }]}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <ChevronRight size={16} color={destructive ? colors.urgent : colors.inkFaint} />
    </Pressable>
  );
}

function formatBackupTime(value: string | null) {
  if (!value) return "Run a backup";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  statusGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusCard: { flex: 1, minHeight: 132, backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12 },
  statusIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statusLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  statusValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 18, lineHeight: 23, marginTop: 2 },
  statusDetail: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { marginBottom: 14 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14, marginBottom: 8 },
  sectionBody: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingHorizontal: 15, paddingVertical: 13 },
  rowIcon: { width: 30, alignItems: "flex-start" },
  rowCopy: { flex: 1, paddingRight: 12 },
  rowLabel: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  rowDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
});
