import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { colors, radius, spacing, fonts } from "../theme/tokens";
import { Card } from "../components/UI";
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileText,
  Flame,
  HeartPulse,
  Leaf,
  MessageCircle,
  Mic,
  Pill,
  Settings,
  ShieldPlus,
  Sparkles,
  Venus,
} from "lucide-react-native";
import { getRecentActivities, type RecentActivity } from "../services/recentActivity";

const PROFILE_KEY = "remi_profile";

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName: string) {
  const trimmed = fullName.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "there";
}

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ME";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function HomeScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState("there");
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const greeting = timeGreeting();
  const avatarInitials = initials(displayName);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      SecureStore.getItemAsync(PROFILE_KEY).then((stored) => {
        if (!mounted || !stored) return;
        try {
          const profile = JSON.parse(stored);
          setDisplayName(profile?.name || "there");
        } catch {
          setDisplayName("there");
        }
      });
      getRecentActivities().then((items) => {
        if (mounted) setActivities(items);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const shortcuts = [
    { label: "Conditions", detail: "Track active health concerns", icon: HeartPulse, route: "Conditions", color: colors.primary },
    { label: "Women's health", detail: "Cycle, symptoms, and reproductive care", icon: Venus, route: "WomensHealth", color: colors.peach },
    { label: "Lifestyle", detail: "Sleep, activity, and daily habits", icon: Leaf, route: "Lifestyle", color: colors.mint },
    { label: "Preventive care", detail: "Screenings, checkups, and reminders", icon: CalendarCheck, route: "PreventiveCare", color: colors.primary },
    { label: "First aid", detail: "Fast guidance for urgent moments", icon: ShieldPlus, route: "FirstAid", color: colors.urgent },
    { label: "Insights", detail: "Patterns from your saved records", icon: Sparkles, route: "DailyInsights", color: colors.peach },
  ];

  const activityIcon = (type: RecentActivity["type"]) => {
    if (type === "chat") return MessageCircle;
    if (type === "lab") return FileText;
    if (type === "vitals") return Activity;
    if (type === "medication") return Pill;
    return ClipboardList;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{firstName(displayName)}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Settings")} style={styles.avatar}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>{avatarInitials}</Text>
          <View style={styles.avatarBadge}><Settings size={9} color={colors.bg} /></View>
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate("Chat")} style={styles.checkinCard}>
        <Text style={styles.checkinLabel}>Daily check-in</Text>
        <Text style={styles.checkinPrompt}>How are you feeling today?</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <View style={styles.pillActive}><MessageCircle size={12} color={colors.primary} /><Text style={styles.pillActiveText}>Type</Text></View>
          <View style={styles.pill}><Mic size={12} color={colors.inkSoft} /><Text style={styles.pillText}>Speak</Text></View>
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        <Card style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Flame size={14} color={colors.peach} /><Text style={styles.statLabel}>Streak</Text>
          </View>
          <Text style={styles.statValue}>{activities.length ? `${activities.length} logs` : "No logs"}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <CalendarClock size={14} color={colors.primary} /><Text style={styles.statLabel}>Next dose</Text>
          </View>
          <Text style={styles.statValue}>Add meds</Text>
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: 24 }}>
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        <Card style={styles.activityCard}>
          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}><ClipboardList size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>No activity yet</Text>
                <Text style={styles.activitySub}>Conversations, lab uploads, vitals, and medication updates will appear here.</Text>
              </View>
            </View>
          ) : (
            activities.slice(0, 4).map((item, index) => {
              const Icon = activityIcon(item.type);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => item.route && navigation.navigate(item.route)}
                  style={[styles.activityRow, index === activities.slice(0, 4).length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.activityIcon}><Icon size={15} color={colors.primary} /></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySub}>{item.detail}</Text>
                  </View>
                  {item.route ? <ChevronRight size={15} color={colors.inkFaint} /> : null}
                </Pressable>
              );
            })
          )}
        </Card>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SHORTCUTS</Text>
        <View style={styles.shortcutPanel}>
          {shortcuts.map((item, index) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.route}
                onPress={() => navigation.navigate(item.route)}
                style={[styles.shortcutRow, index === shortcuts.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: `${item.color}16` }]}>
                  <Icon size={17} color={item.color} />
                </View>
                <View style={styles.shortcutCopy}>
                  <Text style={styles.shortcutText} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.shortcutDetail} numberOfLines={1}>{item.detail}</Text>
                </View>
                <ChevronRight size={15} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 56 },
  greeting: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  name: { color: colors.ink, fontFamily: fonts.display, fontSize: 25 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  avatarBadge: { position: "absolute", right: -1, bottom: -1, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  checkinCard: { marginHorizontal: spacing.xl, marginTop: 18, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  checkinLabel: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  checkinPrompt: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, marginTop: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5 },
  pillActive: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pillActiveText: { color: colors.primary, fontFamily: fonts.body, fontSize: 11.5 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.xl, marginTop: 12 },
  statLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  statValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 21 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 10 },
  activityCard: { paddingVertical: 4, paddingHorizontal: 14 },
  emptyActivity: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  emptyIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  activityTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2, lineHeight: 15 },
  shortcutPanel: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  shortcutRow: { flexDirection: "row", alignItems: "center", minHeight: 58, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  shortcutIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 11 },
  shortcutCopy: { flex: 1, paddingRight: 8 },
  shortcutText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 },
  shortcutDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});
