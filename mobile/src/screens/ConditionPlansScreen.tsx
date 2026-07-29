import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, BookOpen, CalendarClock, ChevronRight, ClipboardList } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { getSavedConditionPlans, SavedConditionPlan } from "../services/conditionPlans";

export default function ConditionPlansScreen({ navigation }: any) {
  const [plans, setPlans] = useState<SavedConditionPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getSavedConditionPlans().then((items) => {
        if (mounted) setPlans(items);
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
          <Text style={styles.badgeText}>Plans</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ClipboardList size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>SAVED CONDITION PLANS</Text>
        <Text style={styles.title}>Your care plans</Text>
        <Text style={styles.subtitle}>Review the plans you have created and keep the key details easy to find.</Text>
      </View>

      {plans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No saved plans yet</Text>
          <Text style={styles.emptyText}>When you save a condition setup plan, it will appear here.</Text>
        </View>
      ) : (
        plans.map((plan) => (
          <View key={plan.condition} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <CalendarClock size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planSub}>{plan.subtitle}</Text>
              </View>
            </View>

            <View style={styles.detailList}>
              {plan.details.slice(0, 7).map((detail) => (
                <View key={`${plan.condition}-${detail.label}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{detail.value}</Text>
                </View>
              ))}
            </View>

            <Pressable onPress={() => navigation.navigate("ConditionEducation", { condition: plan.condition })} style={styles.educationButton}>
              <BookOpen size={15} color={colors.primary} />
              <Text style={styles.educationText}>Open condition guide</Text>
              <ChevronRight size={15} color={colors.primary} />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  emptyText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  planCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  planHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  planIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  planTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  planSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  detailList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  detailRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  detailLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  detailValue: { color: colors.ink, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  educationButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primaryDim, borderRadius: 999, marginTop: 14 },
  educationText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
});
