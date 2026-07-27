import React, { useEffect, useState } from "react";
import { AlertButton, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { registerRemiAlertHost } from "../services/remiAlert";

type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

export default function RemiAlertHost() {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => registerRemiAlertHost(setPayload), []);

  if (!payload) return null;

  const buttons = payload.buttons?.length ? payload.buttons : [{ text: "OK" }];
  const hasDestructive = buttons.some((button) => button.style === "destructive");
  const iconColor = hasDestructive ? colors.urgent : payload.title.toLowerCase().includes("ready") || payload.title.toLowerCase().includes("confirmed") ? colors.mint : colors.primary;
  const Icon = hasDestructive ? AlertTriangle : payload.title.toLowerCase().includes("ready") || payload.title.toLowerCase().includes("confirmed") ? CheckCircle2 : Info;

  const close = (button?: AlertButton) => {
    setPayload(null);
    button?.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(buttons.find((button) => button.style === "cancel"))}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: hasDestructive ? colors.urgentDim : colors.primaryDim }]}>
              <Icon size={24} color={iconColor} />
            </View>
            <Pressable onPress={() => close(buttons.find((button) => button.style === "cancel"))} style={styles.closeButton}>
              <X size={17} color={colors.inkFaint} />
            </Pressable>
          </View>

          <Text style={styles.title}>{payload.title}</Text>
          {payload.message ? <Text style={styles.message}>{payload.message}</Text> : null}

          <View style={[styles.actions, buttons.length > 2 && styles.actionsStacked]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";
              const primary = !isCancel && index === buttons.length - 1;
              return (
                <Pressable
                  key={`${button.text || "OK"}-${index}`}
                  onPress={() => close(button)}
                  style={[styles.actionButton, buttons.length <= 2 && styles.actionButtonInline, primary && styles.primaryButton, isDestructive && styles.destructiveButton]}
                >
                  <Text style={[styles.actionText, primary && styles.primaryText, isDestructive && styles.destructiveText]}>{button.text || "OK"}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.46)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  message: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  actionsStacked: { flexDirection: "column" },
  actionButton: { minHeight: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  actionButtonInline: { flex: 1 },
  primaryButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  destructiveButton: { backgroundColor: colors.urgentDim, borderColor: colors.urgentDim },
  actionText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  primaryText: { color: colors.bg },
  destructiveText: { color: colors.urgent },
});
