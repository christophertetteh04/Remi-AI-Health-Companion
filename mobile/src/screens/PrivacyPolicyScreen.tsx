import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Database, EyeOff, FileText, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";

const highlights = [
  { icon: ShieldCheck, title: "Private by design", detail: "Remi does not sell health data or use it for advertising." },
  { icon: EyeOff, title: "Limited analytics", detail: "PostHog receives event names and safe categories only, never health text." },
  { icon: UserCheck, title: "Your controls", detail: "You can export data, delete account data, turn off analytics, and use app lock." },
];

const sections = [
  {
    title: "What Remi Collects",
    body: "Remi stores the account details and health records you choose to add, including profile details, symptoms, check-ins, vitals, medications, lab reports, prescription scans, condition tracking, lifestyle entries, cycle data, and emergency information.",
  },
  {
    title: "How Remi Uses Data",
    body: "Your information is used to provide Remi features such as chat check-ins, reminders, record organization, plain-language summaries, exports, and safety tools. Remi is not a medical device and does not diagnose, treat, or replace a licensed clinician.",
  },
  {
    title: "Third-Party Services",
    body: "Remi may use Supabase for authentication, database, and storage; Claude for summaries and explanations; OpenAI Whisper for voice transcription; Sentry for crash reporting; Google Places for pharmacy lookup; and PostHog for product analytics.",
  },
  {
    title: "Analytics Privacy",
    body: "Product analytics are on by default and can be turned off in Settings under Data. Remi sends only event names and limited categories such as urgency tier or selected condition type. Remi does not send symptom descriptions, chat messages, lab explanations, medication names, prescription text, or other free-text health content to analytics.",
  },
  {
    title: "Security",
    body: "Remi uses encrypted transport and private storage controls. Sensitive free-text health fields may be encrypted before storage where supported. You can also enable app lock with Face ID, fingerprint, or device passcode.",
  },
  {
    title: "Your Choices",
    body: "You can view your records in the app, export your health data, request deletion of account data, turn off product analytics, manage emergency details, and sign out at any time from Settings.",
  },
  {
    title: "Children And Changes",
    body: "Remi is not directed at children without appropriate parental involvement. If this policy changes materially, Remi should notify users in the app or through another appropriate channel.",
  },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <LockKeyhole size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Privacy</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <FileText size={27} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>REMI PRIVACY</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>A clear summary of what Remi collects, how it is used, and the controls you have over your health information.</Text>
      </View>

      <View style={styles.highlightGrid}>
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.title} style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <Icon size={17} color={colors.primary} />
              </View>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Text style={styles.highlightText}>{item.detail}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.notice}>
        <Database size={17} color={colors.mint} />
        <Text style={styles.noticeText}>This in-app policy is a draft summary for Remi. Have the full policy reviewed by a qualified lawyer before public launch.</Text>
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
        <ShieldCheck size={15} color={colors.primary} />
        <Text style={styles.footerText}>Contact details and final legal wording should match the published privacy-policy.md before release.</Text>
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
  highlightGrid: { gap: 10, marginBottom: 12 },
  highlightCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  highlightIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  highlightTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  highlightText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  notice: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 12 },
  noticeText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  content: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: "hidden" },
  section: { flexDirection: "row", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  sectionNumber: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  sectionNumberText: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  sectionBody: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 12, padding: 14, marginTop: 12 },
  footerText: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
