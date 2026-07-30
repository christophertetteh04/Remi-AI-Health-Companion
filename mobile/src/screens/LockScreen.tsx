import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import { Lock } from "lucide-react-native";

export default function LockScreen({ onUnlock, onUnlockWithPin }: { onUnlock: () => Promise<boolean>; onUnlockWithPin?: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onUnlock(); // prompt immediately on mount so the user isn't stuck tapping
  }, []);

  const submitPin = async () => {
    if (!onUnlockWithPin || pin.length < 4) return;
    const ok = await onUnlockWithPin(pin);
    if (!ok) {
      setError("That PIN did not unlock Remi.");
      setPin("");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Lock size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>Remi is locked</Text>
      <Text style={styles.body}>Your health information stays private on this device.</Text>
      {onUnlockWithPin ? (
        <View style={styles.pinCard}>
          <Text style={styles.pinLabel}>Enter Remi PIN</Text>
          <TextInput
            value={pin}
            onChangeText={(value) => {
              setError("");
              setPin(value.replace(/\D/g, "").slice(0, 6));
            }}
            secureTextEntry
            keyboardType="number-pad"
            placeholder="PIN"
            placeholderTextColor={colors.inkFaint}
            style={styles.pinInput}
            onSubmitEditing={submitPin}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton title="Unlock with PIN" onPress={submitPin} style={{ marginTop: 12, width: 200, opacity: pin.length >= 4 ? 1 : 0.5 }} />
        </View>
      ) : null}
      <PrimaryButton title="Unlock" onPress={onUnlock} style={{ marginTop: 28, width: 200 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, marginBottom: 8 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, textAlign: "center", lineHeight: 19 },
  pinCard: { width: "100%", maxWidth: 280, alignItems: "center", marginTop: 24 },
  pinLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12, marginBottom: 8 },
  pinInput: { width: 200, minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.display, fontSize: 18, textAlign: "center", paddingHorizontal: 14 },
  errorText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 8, textAlign: "center" },
});
