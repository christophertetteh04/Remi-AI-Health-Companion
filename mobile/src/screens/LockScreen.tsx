import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import { Lock } from "lucide-react-native";

export default function LockScreen({ onUnlock }: { onUnlock: () => Promise<boolean> }) {
  useEffect(() => {
    onUnlock(); // prompt immediately on mount so the user isn't stuck tapping
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Lock size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>Remi is locked</Text>
      <Text style={styles.body}>Your health information stays private on this device.</Text>
      <PrimaryButton title="Unlock" onPress={onUnlock} style={{ marginTop: 28, width: 200 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, marginBottom: 8 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, textAlign: "center", lineHeight: 19 },
});
