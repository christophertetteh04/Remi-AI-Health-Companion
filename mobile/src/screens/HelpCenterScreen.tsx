import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, ChevronRight, CircleHelp, FileText, HeartPulse, LifeBuoy, MessageCircle, ShieldCheck, X } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";

const guides = [
  {
    icon: MessageCircle,
    title: "Chat with Remi",
    detail: "Describe what you are feeling, review the reply, and seek clinical care for urgent symptoms.",
    actionLabel: "Open Chat",
    route: "Chat",
    steps: [
      "Start with what you are feeling and when it began.",
      "Answer Remi's follow-up questions so your notes are clearer.",
      "Use photo or document upload when you want to attach a health item.",
      "For urgent symptoms, follow Remi's care recommendation promptly.",
    ],
  },
  {
    icon: HeartPulse,
    title: "Track health records",
    detail: "Log vitals, medications, labs, conditions, lifestyle, and cycle notes from their dedicated screens.",
    actionLabel: "Open Health Overview",
    route: "HealthOverview",
    steps: [
      "Use Vitals for blood pressure and glucose readings.",
      "Use Meds for prescriptions, dose reminders, and taken logs.",
      "Use Labs, Scan, and Sample screens for uploaded records.",
      "Review everything together from Health Overview and Recent Activity.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Privacy controls",
    detail: "Manage app lock, analytics opt-out, exports, and emergency details from Settings and Safety.",
    actionLabel: "Back to Settings",
    route: null,
    steps: [
      "Turn on App lock if you share your device.",
      "Use Quiet hours to reduce routine alerts overnight.",
      "Export health data when you need a copy for your records.",
      "Delete account data only when you are sure you want permanent removal.",
    ],
  },
  {
    icon: FileText,
    title: "Prepare for visits",
    detail: "Use Health Overview to review timeline events, patterns, and a doctor-ready summary.",
    actionLabel: "Open Health Overview",
    route: "HealthOverview",
    steps: [
      "Review recent symptoms, vitals, medications, and uploads before the visit.",
      "Add body-map locations when Remi asks, so your concern is easier to explain.",
      "Generate a doctor-prep summary before your appointment.",
      "After the visit, log what the doctor said and upload any prescription you received.",
    ],
  },
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
  const [selectedGuide, setSelectedGuide] = useState<typeof guides[number] | null>(null);

  const openGuideAction = () => {
    if (!selectedGuide) return;
    const route = selectedGuide.route;
    setSelectedGuide(null);
    if (route) navigation.navigate(route);
  };

  return (
    <>
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
            <Pressable key={guide.title} onPress={() => setSelectedGuide(guide)} style={({ pressed }) => [styles.guideRow, pressed && styles.guideRowPressed]}>
              <View style={styles.guideIcon}>
                <Icon size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{guide.title}</Text>
                <Text style={styles.rowText}>{guide.detail}</Text>
              </View>
              <ChevronRight size={15} color={colors.inkFaint} />
            </Pressable>
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

    <Modal visible={!!selectedGuide} transparent animationType="fade" onRequestClose={() => setSelectedGuide(null)}>
      <View style={styles.guideBackdrop}>
        <View style={styles.guideSheet}>
          <View style={styles.sheetTop}>
            <View style={styles.sheetIcon}>
              {selectedGuide ? <selectedGuide.icon size={22} color={colors.primary} /> : null}
            </View>
            <Pressable onPress={() => setSelectedGuide(null)} style={styles.closeButton}>
              <X size={17} color={colors.inkFaint} />
            </Pressable>
          </View>
          <Text style={styles.sheetEyebrow}>POPULAR GUIDE</Text>
          <Text style={styles.sheetTitle}>{selectedGuide?.title}</Text>
          <Text style={styles.sheetIntro}>{selectedGuide?.detail}</Text>
          <View style={styles.stepList}>
            {selectedGuide?.steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={openGuideAction} style={styles.sheetAction}>
            <Text style={styles.sheetActionText}>{selectedGuide?.actionLabel}</Text>
            <ChevronRight size={15} color={colors.bg} />
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
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
  guideRowPressed: { backgroundColor: colors.bg },
  guideIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  rowText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  faqBlock: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14 },
  footerText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
  guideBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end", padding: 16 },
  guideSheet: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  sheetTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  sheetIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  sheetEyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 6 },
  sheetTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, lineHeight: 29 },
  sheetIntro: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 7 },
  stepList: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginTop: 16, padding: 12, gap: 11 },
  stepRow: { flexDirection: "row", alignItems: "flex-start" },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 10 },
  stepNumberText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  stepText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  sheetAction: { minHeight: 48, borderRadius: 999, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  sheetActionText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
