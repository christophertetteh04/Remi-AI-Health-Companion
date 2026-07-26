import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

export function ConditionLeavePrompt({
  visible,
  title,
  message,
  onContinue,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={22} color={colors.peach} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionStack}>
            <Pressable onPress={onContinue} style={styles.primaryAction}>
              <Check size={17} color={colors.bg} />
              <Text style={styles.primaryText}>Continue editing</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.secondaryAction}>
              <ArrowLeft size={17} color={colors.inkSoft} />
              <Text style={styles.secondaryText}>Cancel and return</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 32, 51, 0.42)",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.peachDim,
    marginBottom: 14,
  },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  message: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  actionStack: { gap: 10, marginTop: 18 },
  primaryAction: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  secondaryAction: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
});
