import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../theme/tokens";
import { Card, UrgencyDot } from "../components/UI";
import { MessageCircle, Mic, Flame, CalendarClock, Sparkles } from "lucide-react-native";

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.name}>Ama</Text>
        </View>
        <View style={styles.avatar}><Text style={{ color: colors.primary, fontFamily: fonts.displayItalic }}>AO</Text></View>
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
          <Text style={styles.statValue}>6 days</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <CalendarClock size={14} color={colors.primary} /><Text style={styles.statLabel}>Next dose</Text>
          </View>
          <Text style={styles.statValue}>2:00 PM</Text>
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: 24 }}>
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        {[
          { level: "monitor" as const, t: "Headache logged, 3 days running", s: "Recommended: see a doctor soon" },
          { level: "normal" as const, t: "Blood pressure check-in — 118/76", s: "Within your normal range" },
        ].map((r, i) => (
          <View key={i} style={styles.activityRow}>
            <UrgencyDot level={r.level} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.activityTitle}>{r.t}</Text>
              <Text style={styles.activitySub}>{r.s}</Text>
            </View>
          </View>
        ))}
        <View style={styles.activityRow}>
          <Sparkles size={13} color={colors.peach} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.activityTitle}>Lab result compared to last visit</Text>
            <Text style={styles.activitySub}>Hemoglobin trending back to normal</Text>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate("Conditions")} style={{ paddingVertical: 14 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Manage tracked conditions →</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("WomensHealth")} style={{ paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Women's health →</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Lifestyle")} style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Lifestyle tracking →</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("PreventiveCare")} style={{ paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Preventive care →</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("FirstAid")} style={{ paddingVertical: 10 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>First aid reference →</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("DailyInsights")} style={{ paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>Health insights →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 56 },
  greeting: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  name: { color: colors.ink, fontFamily: fonts.displayItalic, fontSize: 26 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  checkinCard: { marginHorizontal: spacing.xl, marginTop: 18, backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 22 },
  checkinLabel: { color: colors.primary, fontFamily: fonts.body, fontSize: 11.5 },
  checkinPrompt: { color: colors.ink, fontFamily: fonts.displayItalic, fontSize: 21, marginTop: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5 },
  pillActive: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pillActiveText: { color: colors.primary, fontFamily: fonts.body, fontSize: 11.5 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.xl, marginTop: 12 },
  statLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  statValue: { color: colors.ink, fontFamily: fonts.mono, fontSize: 22 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 10 },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  activityTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});
