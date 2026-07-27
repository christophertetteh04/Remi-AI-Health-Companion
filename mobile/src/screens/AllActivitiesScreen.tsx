import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Activity, ArrowLeft, ChevronRight, ClipboardList, FileText, MessageCircle, Pill } from "lucide-react-native";
import { Card } from "../components/UI";
import { colors, fonts, spacing } from "../theme/tokens";
import { getRecentActivities, type RecentActivity } from "../services/recentActivity";

function activityIcon(type: RecentActivity["type"]) {
  if (type === "chat") return MessageCircle;
  if (type === "lab") return FileText;
  if (type === "vitals") return Activity;
  if (type === "medication") return Pill;
  return ClipboardList;
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <ClipboardList size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{activities.length} saved</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ClipboardList size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>ACTIVITY HISTORY</Text>
        <Text style={styles.title}>All recent activity</Text>
        <Text style={styles.subtitle}>A clean record of conversations, lab uploads, vitals, medications, and care updates saved on this device.</Text>
      </View>

      <Card style={styles.activityCard}>
        {activities.length === 0 ? (
          <View style={styles.emptyActivity}>
            <View style={styles.emptyIcon}>
              <ClipboardList size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>No activity yet</Text>
              <Text style={styles.activitySub}>Your Remi activity will appear here after you chat, upload labs, log vitals, or update care plans.</Text>
            </View>
          </View>
        ) : (
          activities.map((item, index) => {
            const Icon = activityIcon(item.type);
            return (
              <Pressable
                key={item.id}
                onPress={() => item.route && navigation.navigate(item.route)}
                style={[styles.activityRow, index === activities.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.activityIcon}>
                  <Icon size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.activityTitleRow}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityDate}>{formatActivityDate(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.activitySub}>{item.detail}</Text>
                </View>
                {item.route ? <ChevronRight size={15} color={colors.inkFaint} /> : null}
              </Pressable>
            );
          })
        )}
      </Card>
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
  activityCard: { paddingVertical: 4, paddingHorizontal: 14 },
  emptyActivity: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  emptyIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  activityTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  activityTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  activityDate: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
});
