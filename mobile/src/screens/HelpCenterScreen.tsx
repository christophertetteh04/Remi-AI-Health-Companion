import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, ChevronRight, CircleHelp, FileText, HeartPulse, LifeBuoy, MessageCircle, ShieldCheck } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";

const guides = [
  { icon: MessageCircle, title: "Chat with Remi", detail: "Describe what you are feeling, review the reply, and seek clinical care for urgent symptoms." },
  { icon: HeartPulse, title: "Track health records", detail: "Log vitals, medications, labs, conditions, lifestyle, and cycle notes from their dedicated screens." },
  { icon: ShieldCheck, title: "Privacy controls", detail: "Manage app lock, analytics opt-out, exports, and emergency details from Settings and Safety." },
  { icon: FileText, title: "Prepare for visits", detail: "Use Health Overview to review timeline events, patterns, and a doctor-ready summary." },
];

const faqs = [
  {
    question: "Is Remi a doctor?",
    answer: "No. Remi organizes information and explains logged data in plain language. It does not diagnose, treat, or replace a licensed clinician.",
  },
  {
    question: "What should I do in an emergency?",
    answer: "Use local emergency services immediately. In Ghana, the Safety screen includes a quick Call 112 action.",
  },
  {
    question: "Can I turn off product analytics?",
    answer: "Yes. Open Settings, go to Data, and turn off Share product analytics.",
  },
  {
    question: "Why does Remi ask me to confirm scanned prescriptions?",
    answer: "OCR can be wrong. Remi always shows prescription fields for review before saving anything to medications.",
  },
];

export default function HelpCenterScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <LifeBuoy size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Support</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <CircleHelp size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>HELP CENTER</Text>
        <Text style={styles.title}>How can we help?</Text>
        <Text style={styles.subtitle}>Find quick guidance for using Remi safely and getting the most from your health records.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>POPULAR GUIDES</Text>
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <View key={guide.title} style={styles.guideRow}>
              <View style={styles.guideIcon}>
                <Icon size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{guide.title}</Text>
                <Text style={styles.rowText}>{guide.detail}</Text>
              </View>
              <ChevronRight size={15} color={colors.inkFaint} />
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FAQ</Text>
        {faqs.map((faq) => (
          <View key={faq.question} style={styles.faqBlock}>
            <Text style={styles.rowTitle}>{faq.question}</Text>
            <Text style={styles.rowText}>{faq.answer}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.footerText}>Support guidance is informational only. For medical advice, contact a licensed clinician.</Text>
      </View>
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
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingTop: 14, marginBottom: 12, overflow: "hidden" },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginHorizontal: 16, marginBottom: 2 },
  guideRow: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  guideIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  rowText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  faqBlock: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14 },
  footerText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
