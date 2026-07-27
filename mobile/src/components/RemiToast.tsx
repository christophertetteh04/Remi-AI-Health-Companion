import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Toast, { ToastConfig } from "react-native-toast-message";
import { ShieldCheck } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

export const remiToastConfig: ToastConfig = {
  remiInfo: ({ text1, text2 }) => (
    <View style={styles.toastCard}>
      <View style={styles.toastIcon}>
        <ShieldCheck size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        {text1 ? <Text style={styles.toastTitle}>{text1}</Text> : null}
        {text2 ? <Text style={styles.toastText}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

export const showRemiToast = (title: string, message: string) => {
  Toast.show({
    type: "remiInfo",
    text1: title,
    text2: message,
    position: "top",
    visibilityTime: 3200,
    autoHide: true,
    topOffset: 56,
  });
};

export default function RemiToast() {
  return <Toast config={remiToastConfig} />;
}

const styles = StyleSheet.create({
  toastCard: {
    width: "90%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  toastIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  toastTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  toastText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
