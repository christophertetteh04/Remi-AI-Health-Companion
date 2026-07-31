import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Activity, ArrowLeft, ChevronRight, ClipboardList, FileText, MessageCircle, Pill, ShieldAlert, Sparkles } from "lucide-react-native";
import { Card } from "../components/UI";
import SmoothEntrance from "../components/SmoothEntrance";
import { colors, fonts, spacing } from "../theme/tokens";
import { getRecentActivities, type RecentActivity } from "../services/recentActivity";

function activityIcon(type: RecentActivity["type"]) {
  if (type === "chat") return MessageCircle;
  if (type === "lab") return FileText;
  if (type === "vitals") return Activity;
  if (type === "medication") return Pill;
  if (type === "safety") return ShieldAlert;
  return ClipboardList;
}

function activityMeta(type: RecentActivity["type"]) {
  if (type === "chat") return { color: colors.primary, bg: colors.primaryDim, label: "Chat" };
  if (type === "lab") return { color: colors.peach, bg: colors.peachDim, label: "Lab" };
  if (type === "vitals") return { color: colors.mint, bg: colors.mintDim, label: "Vitals" };
  if (type === "medication") return { color: colors.primary, bg: colors.primaryDim, label: "Meds" };
  if (type === "safety") return { color: colors.urgent, bg: colors.urgentDim, label: "Safety" };
  return { color: colors.inkSoft, bg: colors.surfaceRaised, label: "Update" };
}

function formatActivityDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AllActivitiesScreen({ navigation }: any) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const latestActivity = activities[0];
  const uniqueTypes = new Set(activities.map((activity) => activity.type)).size;

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getRecentActivities().then((items) => {
        if (mounted) setActivities(items);
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container} decelerationRate="fast" scrollEventThrottle={16}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <ClipboardList size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{activities.length} saved</Text>
        </View>
      </View>

      <SmoothEntrance>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <ClipboardList size={28} color={colors.primary} />
            </View>
            <View style={styles.heroGlow}>
              <Sparkles size={16} color={colors.peach} />
            </View>
          </View>
          <Text style={styles.eyebrow}>ACTIVITY HISTORY</Text>
          <Text style={styles.title}>All recent activity</Text>
          <Text style={styles.subtitle}>A clean record of conversations, lab uploads, vitals, medications, and care updates saved on this device.</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue} numberOfLines={1}>{activities.length}</Text>
              <Text style={styles.summaryLabel}>Saved</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue} numberOfLines={1}>{uniqueTypes}</Text>
              <Text style={styles.summaryLabel}>Types</Text>
            </View>
            <View style={styles.summaryTileWide}>
              <Text style={styles.summaryValueSmall} numberOfLines={1}>{latestActivity ? formatActivityDate(latestActivity.createdAt) : "None yet"}</Text>
              <Text style={styles.summaryLabel}>Latest</Text>
            </View>
          </View>
        </View>
      </SmoothEntrance>

      <SmoothEntrance delay={70}>
        <Card style={styles.activityCard}>
          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}>
                <ClipboardList size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySub}>Your Remi activity will appear here after you chat, upload labs, log vitals, or update care plans.</Text>
              </View>
            </View>
          ) : (
            activities.map((item, index) => {
              const Icon = activityIcon(item.type);
              const meta = activityMeta(item.type);
              return (
                <SmoothEntrance key={`${item.id}-${index}`} delay={Math.min(index, 10) * 35}>
                  <Pressable
                    onPress={() => navigation.navigate("ActivityDetail", { activityId: item.id })}
                    style={({ pressed }) => [styles.activityRow, pressed && styles.activityRowPressed]}
                  >
                    <View style={styles.timelineRail}>
                      <View style={[styles.activityIcon, { backgroundColor: meta.bg }]}>
                        <Icon size={17} color={meta.color} />
                      </View>
                      {index !== activities.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.activityBody}>
                      <View style={styles.activityTitleRow}>
                        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.typeText, { color: meta.color }]} numberOfLines={1}>{meta.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.activitySub} numberOfLines={2}>{item.detail}</Text>
                      <Text style={styles.activityDate} numberOfLines={1}>{formatActivityDate(item.createdAt)}</Text>
                    </View>
                    <ChevronRight size={15} color={colors.inkFaint} style={styles.chevron} />
                  </Pressable>
                </SmoothEntrance>
              );
            })
          )}
        </Card>
      </SmoothEntrance>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  heroGlow: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  summaryTile: { flexGrow: 1, flexBasis: 92, minWidth: 0, minHeight: 58, borderRadius: 12, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 10, justifyContent: "center" },
  summaryTileWide: { flexGrow: 1, flexBasis: 132, minWidth: 0, minHeight: 58, borderRadius: 12, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 10, justifyContent: "center" },
  summaryValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  summaryValueSmall: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12.5, lineHeight: 17 },
  summaryLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10.5, marginTop: 2 },
  activityCard: { padding: 10, backgroundColor: colors.surface, borderColor: "rgba(216,225,234,0.92)" },
  emptyActivity: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  emptySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3, lineHeight: 17 },
  activityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(216,225,234,0.88)", padding: 12, marginBottom: 9, overflow: "hidden" },
  activityRowPressed: { transform: [{ scale: 0.992 }], backgroundColor: colors.surfaceRaised },
  timelineRail: { alignItems: "center", alignSelf: "stretch", marginRight: 11 },
  timelineLine: { width: 2, flex: 1, minHeight: 14, backgroundColor: colors.hairline, marginTop: 5, borderRadius: 999 },
  activityBody: { flex: 1, minWidth: 0, marginRight: 8 },
  activityTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 },
  activityTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.2, flex: 1, minWidth: 0 },
  activityDate: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 10.5, marginTop: 8 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 4, lineHeight: 16 },
  typeChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 78, flexShrink: 0 },
  typeText: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  chevron: { flexShrink: 0 },
});
