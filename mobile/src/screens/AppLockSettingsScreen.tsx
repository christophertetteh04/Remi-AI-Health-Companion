import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, Check, Clock3, Fingerprint, KeyRound, LockKeyhole, ScanFace, ShieldCheck } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import { DEFAULT_LOCK_TIMEOUT_MS, LOCK_TIMEOUT_KEY, useAppLock } from "../hooks/useAppLock";
import { colors, fonts, spacing } from "../theme/tokens";

const timingOptions = [
  { label: "Immediately", detail: "Lock whenever Remi leaves the screen", value: 0 },
  { label: "After 1 minute", detail: "Good balance for daily use", value: 60 * 1000 },
  { label: "After 5 minutes", detail: "More convenient, slightly less private", value: 5 * 60 * 1000 },
];

type DeviceMethod = { title: string; detail: string; available: boolean; icon: React.ReactNode };

export default function AppLockSettingsScreen({ navigation }: any) {
  const { lockEnabled, pinEnabled, enableLock, disableLock, attemptUnlock, setPin, clearPin } = useAppLock();
  const [saving, setSaving] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_LOCK_TIMEOUT_MS);
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);

  useEffect(() => {
    (async () => {
      const [hardware, enrolled, types, storedTimeout] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        SecureStore.getItemAsync(LOCK_TIMEOUT_KEY),
      ]);
      setHasHardware(hardware);
      setIsEnrolled(enrolled);
      setSupportedTypes(types);
      const parsed = Number(storedTimeout);
      if (Number.isFinite(parsed) && parsed >= 0) setTimeoutMs(parsed);
    })();
  }, []);

  const methods: DeviceMethod[] = [
    {
      title: "Face unlock",
      detail: "Use Face ID or supported facial recognition.",
      available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      icon: <ScanFace size={18} color={colors.primary} />,
    },
    {
      title: "Fingerprint",
      detail: "Use Touch ID or Android fingerprint unlock.",
      available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      icon: <Fingerprint size={18} color={colors.primary} />,
    },
    {
      title: "Remi PIN",
      detail: pinEnabled ? "A Remi PIN is configured as a private app fallback." : "Add a Remi PIN for shared-device unlock.",
      available: true,
      icon: <KeyRound size={18} color={colors.primary} />,
    },
  ];

  const enableDeviceLock = async () => {
    if (!hasHardware && !isEnrolled) {
      Alert.alert("Device lock unavailable", "Set up Face ID, fingerprint, or a device passcode in your phone settings before turning on Remi App Lock.");
      return;
    }

    setSaving(true);
    try {
      const unlocked = await attemptUnlock();
      if (!unlocked) return;
      await enableLock();
      Alert.alert("App Lock is on", "Remi will ask for your device unlock method when the app locks.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (value: boolean) => {
    if (value) await enableDeviceLock();
    else await disableLock();
  };

  const chooseTiming = async (value: number) => {
    setTimeoutMs(value);
    await SecureStore.setItemAsync(LOCK_TIMEOUT_KEY, String(value));
  };

  const savePin = async () => {
    if (pinDraft.length < 4) {
      Alert.alert("PIN too short", "Choose at least 4 digits for your Remi PIN.");
      return;
    }
    if (pinDraft !== pinConfirm) {
      Alert.alert("PINs do not match", "Enter the same PIN twice.");
      return;
    }
    await setPin(pinDraft);
    setPinDraft("");
    setPinConfirm("");
    Alert.alert("Remi PIN saved", "You can unlock Remi with biometrics or your app PIN.");
  };

  const removePin = () => {
    Alert.alert("Remove Remi PIN?", "Biometric or device unlock can still protect Remi if App Lock is on.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove PIN", style: "destructive", onPress: clearPin },
    ]);
  };

  const testLock = async () => {
    if (!lockEnabled) {
      Alert.alert("Turn on App Lock first", "Enable App Lock, then use Test lock to confirm your device unlock flow.");
      return;
    }
    const unlocked = await attemptUnlock();
    Alert.alert(unlocked ? "Unlock confirmed" : "Unlock was cancelled", unlocked ? "Your app lock method is ready." : "Remi will stay protected when the lock screen appears.");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <LockKeyhole size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{lockEnabled ? "Enabled" : "Off"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ShieldCheck size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>APP LOCK</Text>
        <Text style={styles.title}>Choose how Remi stays private.</Text>
        <Text style={styles.subtitle}>Use the security already configured on this device. Remi never stores your fingerprint, face, or passcode.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlTitle}>Require App Lock</Text>
          <Text style={styles.controlText}>Ask for device unlock before reopening protected health records.</Text>
        </View>
        <Switch
          value={lockEnabled}
          onValueChange={toggleLock}
          disabled={saving}
          trackColor={{ false: colors.surfaceRaised, true: colors.primaryDim }}
          thumbColor={lockEnabled ? colors.primary : colors.inkFaint}
          ios_backgroundColor={colors.surfaceRaised}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AVAILABLE OPTIONS</Text>
        {methods.map((method) => (
          <View key={method.title} style={[styles.methodRow, !method.available && styles.methodUnavailable]}>
            <View style={styles.methodIcon}>{method.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodText}>{method.available ? method.detail : "Not available on this device right now."}</Text>
            </View>
            {method.available ? (
              <View style={styles.checkIcon}>
                <Check size={13} color={colors.bg} />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <KeyRound size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Remi PIN</Text>
        </View>
        <View style={styles.pinSetup}>
          <Text style={styles.pinSetupText}>Use a private app PIN as a fallback when biometrics are unavailable or cancelled.</Text>
          <TextInput value={pinDraft} onChangeText={(value) => setPinDraft(value.replace(/\D/g, "").slice(0, 6))} secureTextEntry keyboardType="number-pad" placeholder="New PIN" placeholderTextColor={colors.inkFaint} style={styles.pinInput} />
          <TextInput value={pinConfirm} onChangeText={(value) => setPinConfirm(value.replace(/\D/g, "").slice(0, 6))} secureTextEntry keyboardType="number-pad" placeholder="Confirm PIN" placeholderTextColor={colors.inkFaint} style={styles.pinInput} />
          <Pressable onPress={savePin} style={styles.pinSaveButton}>
            <KeyRound size={15} color={colors.bg} />
            <Text style={styles.pinSaveText}>{pinEnabled ? "Change Remi PIN" : "Set Remi PIN"}</Text>
          </Pressable>
          {pinEnabled ? (
            <Pressable onPress={removePin} style={styles.pinRemoveButton}>
              <Text style={styles.pinRemoveText}>Remove Remi PIN</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Clock3 size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Lock timing</Text>
        </View>
        {timingOptions.map((option) => {
          const selected = timeoutMs === option.value;
          return (
            <Pressable key={option.value} onPress={() => chooseTiming(option.value)} style={[styles.timingRow, selected && styles.timingSelected]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timingTitle}>{option.label}</Text>
                <Text style={styles.timingText}>{option.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <LockKeyhole size={15} color={colors.mint} />
        <Text style={styles.noteText}>Remi notifications stay generic on the lock screen. Open the app and unlock Remi to view health details.</Text>
      </View>

      <PrimaryButton title="Test app lock" onPress={testLock} style={{ opacity: lockEnabled ? 1 : 0.52 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  controlCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  controlTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  controlText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4, paddingRight: 12 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingTop: 14, marginBottom: 12, overflow: "hidden" },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginHorizontal: 16, marginBottom: 2 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 2 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  methodRow: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  methodUnavailable: { opacity: 0.48 },
  methodIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  methodTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  methodText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  pinSetup: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, padding: 16, gap: 10 },
  pinSetupText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  pinInput: { minHeight: 48, borderRadius: 13, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15, paddingHorizontal: 14 },
  pinSaveButton: { minHeight: 46, borderRadius: 999, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  pinSaveText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  pinRemoveButton: { alignItems: "center", paddingVertical: 8 },
  pinRemoveText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  timingRow: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  timingSelected: { backgroundColor: colors.primaryDim },
  timingTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  timingText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
