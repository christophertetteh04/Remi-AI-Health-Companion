import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, FileText, HeartPulse, LockKeyhole, ShieldCheck } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";

const sections = [
  {
    title: "What Remi Provides",
    body: "Remi helps you organize health information, track reminders, prepare for appointments, and understand logged records in plain language. Remi is not a medical device and does not diagnose, treat, cure, or prevent any condition.",
  },
  {
    title: "Medical Decisions",
    body: "Information in Remi is educational and organizational only. Always confirm symptoms, lab results, medications, treatment changes, and urgent concerns with a licensed clinician or emergency service.",
  },
  {
    title: "Your Account",
    body: "You are responsible for keeping your login details secure and for entering accurate information. Do not use another person's account or submit information you are not authorized to manage.",
  },
  {
    title: "Privacy And Data",
    body: "Remi is designed to handle health information carefully. Some sensitive fields may be encrypted before storage, and product analytics are limited to event counts and safe categories. Free-text health content should never be sent to analytics services.",
  },
  {
    title: "Acceptable Use",
    body: "Do not misuse Remi, attempt to bypass security controls, upload harmful content, reverse engineer protected systems, or use the app to harass, threaten, or harm another person.",
  },
  {
    title: "Limitations",
    body: "Remi may be unavailable, incomplete, or inaccurate at times. The app should not replace professional medical judgment, emergency care, or official medical records.",
  },
  {
    title: "Changes",
    body: "These terms may be updated as Remi improves. If changes are material, Remi should notify users in-app or through another appropriate channel.",
  },
];

export default function TermsOfServiceScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.updatedPill}>
          <FileText size={13} color={colors.primary} />
          <Text style={styles.updatedText}>Terms</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ShieldCheck size={26} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>REMI LEGAL</Text>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Clear rules for using Remi safely, privately, and responsibly.</Text>
      </View>

      <View style={styles.notice}>
        <HeartPulse size={17} color={colors.urgent} />
        <Text style={styles.noticeText}>For emergencies, contact local emergency services immediately. Do not wait for app guidance.</Text>
      </View>

      <View style={styles.content}>
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <LockKeyhole size={15} color={colors.mint} />
        <Text style={styles.footerText}>Last updated: Draft for review. Have these terms reviewed by a qualified lawyer before public launch.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  updatedPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  updatedText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  notice: { flexDirection: "row", alignItems: "center", backgroundColor: colors.urgentDim, borderRadius: 12, padding: 14, marginBottom: 12 },
  noticeText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 12.5, lineHeight: 18, marginLeft: 10, flex: 1 },
  content: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  section: { flexDirection: "row", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  sectionNumber: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  sectionNumberText: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  sectionBody: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginTop: 12 },
  footerText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
