import React, { useCallback, useState } from "react";
import { Image, View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
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
  Pill,
  Settings,
  ShieldPlus,
  Sparkles,
  Venus,
} from "lucide-react-native";
import { getRecentActivities, type RecentActivity } from "../services/recentActivity";

const PROFILE_KEY = "remi_profile";
const homeHeroImage = require("../../assets/images/home-dashboard-hero.jpg");

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 28 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{firstName(displayName)}</Text>
          <Text style={styles.headerSub}>Your health dashboard is ready.</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Settings")} style={styles.avatar}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>{avatarInitials}</Text>
          <View style={styles.avatarBadge}><Settings size={9} color={colors.bg} /></View>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Image source={homeHeroImage} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <View style={styles.heroBadge}>
            <Sparkles size={13} color={colors.peach} />
            <Text style={styles.heroBadgeText}>Today at a glance</Text>
          </View>
          <Text style={styles.heroTitle}>Keep your care moving, one small check-in at a time.</Text>
          <Pressable onPress={() => navigation.navigate("Chat")} style={styles.heroButton}>
            <MessageCircle size={14} color={colors.bg} />
            <Text style={styles.heroButtonText}>Start check-in</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statTop}>
            <View style={[styles.statIcon, { backgroundColor: colors.peachDim }]}><Flame size={14} color={colors.peach} /></View>
            <Text style={styles.statLabel}>Activity</Text>
          </View>
          <Text style={styles.statValue}>{activities.length ? `${activities.length} logs` : "No logs"}</Text>
        </Card>
        <Pressable onPress={() => navigation.navigate("Meds")} style={{ flex: 1 }}>
          <Card style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryDim }]}><CalendarClock size={14} color={colors.primary} /></View>
              <Text style={styles.statLabel}>Medication</Text>
            </View>
            <Text style={styles.statValue}>Add meds</Text>
          </Card>
        </Pressable>
      </View>

      <View style={styles.quickStrip}>
        <Pressable onPress={() => navigation.navigate("Chat")} style={styles.quickAction}>
          <View style={styles.quickIcon}><MessageCircle size={16} color={colors.primary} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Check in</Text>
            <Text style={styles.quickSub}>Type or speak</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Vitals")} style={styles.quickAction}>
          <View style={styles.quickIcon}><Activity size={16} color={colors.mint} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Vitals</Text>
            <Text style={styles.quickSub}>Log weekly</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("LabUpload")} style={styles.quickAction}>
          <View style={styles.quickIcon}><FileText size={16} color={colors.peach} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Labs</Text>
            <Text style={styles.quickSub}>Upload</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.sectionWrap}>
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

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CARE TOOLS</Text>
        <View style={styles.shortcutPanel}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.route}
                onPress={() => navigation.navigate(item.route)}
                style={styles.shortcutRow}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: `${item.color}16` }]}>
                  <Icon size={17} color={item.color} />
                </View>
                <View style={styles.shortcutCopy}>
                  <Text style={styles.shortcutText} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.shortcutDetail} numberOfLines={1}>{item.detail}</Text>
                </View>
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
  headerSub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  avatarBadge: { position: "absolute", right: -1, bottom: -1, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  heroCard: { height: 226, marginHorizontal: spacing.xl, marginTop: 18, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16,32,51,0.08)" },
  heroCopy: { position: "absolute", left: 14, right: 14, bottom: 14, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 12, padding: 14 },
  heroBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.peachDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  heroBadgeText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  heroTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, lineHeight: 26, maxWidth: 310 },
  heroButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  heroButtonText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.xl, marginTop: 12 },
  statCard: { flex: 1, minHeight: 92, justifyContent: "space-between" },
  statTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  statValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 21 },
  quickStrip: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.xl, marginTop: 12 },
  quickAction: { flex: 1, minHeight: 74, backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 10, paddingVertical: 10, justifyContent: "space-between" },
  quickIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  quickSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  sectionWrap: { paddingHorizontal: spacing.xl, marginTop: 24 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 10 },
  activityCard: { paddingVertical: 4, paddingHorizontal: 14 },
  emptyActivity: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  emptyIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  activityTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2, lineHeight: 15 },
  shortcutPanel: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  shortcutRow: { width: "48.4%", minHeight: 104, backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, justifyContent: "space-between" },
  shortcutIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  shortcutCopy: { flex: 1 },
  shortcutText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 },
  shortcutDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});
