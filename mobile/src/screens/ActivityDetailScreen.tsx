import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Activity, ArrowLeft, Check, ClipboardList, Edit3, FileText, MessageCircle, Pill, Save } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import { showRemiToast } from "../components/RemiToast";
import { colors, fonts } from "../theme/tokens";
import { getRecentActivity, RecentActivity, updateRecentActivity } from "../services/recentActivity";

function activityIcon(type?: RecentActivity["type"]) {
  if (type === "chat") return MessageCircle;
  if (type === "lab") return FileText;
  if (type === "vitals") return Activity;
  if (type === "medication") return Pill;
  return ClipboardList;
}

function formatActivityDate(createdAt?: string) {
  if (!createdAt) return "Recent";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ActivityDetailScreen({ navigation, route }: any) {
  const activityId = route?.params?.activityId || "";
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getRecentActivity(activityId).then((item) => {
        if (!mounted) return;
        setActivity(item);
        setTitle(item?.title || "");
        setDetail(item?.detail || "");
      });
      return () => {
        mounted = false;
      };
    }, [activityId]),
  );

  const save = async () => {
    if (!activity) return;
    setSaving(true);
    const updated = await updateRecentActivity(activity.id, { title, detail });
    setActivity(updated);
    setEditing(false);
    setSaving(false);
    showRemiToast("Saved", "Activity details updated successfully.", "bottom");
  };

  const Icon = activityIcon(activity?.type);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => setEditing((value) => !value)} style={styles.editButton}>
            <Edit3 size={14} color={colors.primary} />
            <Text style={styles.editText}>{editing ? "Cancel" : "Edit"}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon size={28} color={colors.primary} />
          </View>
          <Text style={styles.eyebrow}>ACTIVITY DETAIL</Text>
          <Text style={styles.title}>{activity ? activity.title : "Activity not found"}</Text>
          <Text style={styles.subtitle}>{activity ? formatActivityDate(activity.createdAt) : "This activity may no longer be available on this device."}</Text>
        </View>

        {activity ? (
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}>
                <Check size={14} color={colors.mint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Saved activity</Text>
                <Text style={styles.statusText}>Type: {activity.type.replace(/_/g, " ")}</Text>
              </View>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} editable={editing} style={[styles.input, !editing && styles.inputLocked]} placeholder="Activity title" placeholderTextColor={colors.inkFaint} />

            <Text style={styles.label}>Details</Text>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              editable={editing}
              style={[styles.input, styles.textArea, !editing && styles.inputLocked]}
              placeholder="Activity details"
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
            />

            {editing ? (
              <PrimaryButton title={saving ? "Saving..." : "Save changes"} onPress={save} style={styles.saveButton} />
            ) : activity.route ? (
              <Pressable onPress={() => navigation.navigate(activity.route)} style={styles.routeButton}>
                <Save size={15} color={colors.primary} />
                <Text style={styles.routeText}>Open related screen</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  editButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  editText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 12, marginBottom: 16 },
  statusIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 10 },
  statusTitle: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  statusText: { color: colors.mint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7, marginTop: 8 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.bg, color: colors.ink, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 13, paddingVertical: 11 },
  inputLocked: { backgroundColor: colors.surfaceRaised, color: colors.inkSoft },
  textArea: { minHeight: 120, lineHeight: 19 },
  saveButton: { marginTop: 16 },
  routeButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primaryDim, borderRadius: 999, marginTop: 16 },
  routeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
