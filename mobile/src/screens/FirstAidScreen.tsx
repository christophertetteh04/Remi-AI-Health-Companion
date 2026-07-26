import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Bandage, ChevronDown, Flame, HeartPulse, Home, PhoneCall, ShieldPlus, Wind } from "lucide-react-native";
import { Card } from "../components/UI";
import { colors, fonts } from "../theme/tokens";

const TOPICS = [
  {
    title: "Choking",
    icon: Wind,
    color: colors.primary,
    summary: "Airway blocked, cannot breathe, cough, or speak.",
    steps: [
      "Ask if they are choking. If they can cough or speak, encourage coughing.",
      "If they cannot breathe, cough, or speak, give 5 firm back blows between the shoulder blades.",
      "If it does not clear, give 5 abdominal thrusts.",
      "Alternate back blows and abdominal thrusts until the object clears or they lose consciousness.",
      "If they lose consciousness, call emergency services and begin CPR if trained.",
    ],
  },
  {
    title: "Burns",
    icon: Flame,
    color: colors.peach,
    summary: "Heat, chemical, electrical, or scald injury.",
    steps: [
      "Cool the burn under cool running water for 10 to 20 minutes.",
      "Remove tight items near the burn before swelling starts.",
      "Cover loosely with a clean non-fluffy cloth or cling film.",
      "Do not use ice, butter, ointments, or burst blisters.",
      "Get medical care for large, deep, white, charred, face, hand, genital, or joint burns.",
    ],
  },
  {
    title: "Bleeding",
    icon: Bandage,
    color: colors.urgent,
    summary: "Heavy bleeding, deep cut, or wound that will not stop.",
    steps: [
      "Apply firm direct pressure with a clean cloth or bandage.",
      "Keep pressing continuously and avoid lifting the cloth to check.",
      "Raise the injured area above heart level if possible.",
      "When bleeding slows, bandage firmly without cutting off circulation.",
      "Seek emergency care for spurting blood, deep wounds, or bleeding that continues after 10 minutes.",
    ],
  },
  {
    title: "Fainting",
    icon: HeartPulse,
    color: colors.mint,
    summary: "Sudden collapse, dizziness, or brief loss of consciousness.",
    steps: [
      "Lay the person flat and raise their legs if possible.",
      "Loosen tight clothing around the neck.",
      "Check breathing. If not breathing, call emergency services and begin CPR if trained.",
      "Once awake, keep them lying down for a few minutes before sitting up slowly.",
      "Get medical help if they do not wake quickly, faint repeatedly, or hit their head.",
    ],
  },
];

export default function FirstAidScreen({ navigation }: any) {
  const [expanded, setExpanded] = useState<string | null>("Choking");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 126 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FIRST AID</Text>
            <Text style={styles.title}>Quick emergency reference</Text>
            <Text style={styles.subtitle}>Simple steps for common situations. Call local emergency services first when danger is immediate.</Text>
          </View>
          <View style={styles.headerIcon}>
            <ShieldPlus size={24} color={colors.urgent} />
          </View>
        </View>

        <View style={styles.content}>
          <Card style={styles.emergencyCard}>
            <View style={styles.emergencyIcon}>
              <PhoneCall size={18} color={colors.urgent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency first</Text>
              <Text style={styles.emergencyText}>If someone is not breathing, has chest pain, severe bleeding, stroke signs, or you are unsure, call emergency services immediately.</Text>
            </View>
          </Card>

          <Text style={styles.sectionLabel}>COMMON FIRST AID TOPICS</Text>
          {TOPICS.map((topic) => {
            const isOpen = expanded === topic.title;
            const Icon = topic.icon;
            return (
              <Card key={topic.title} style={isOpen ? { ...styles.topicCard, ...styles.topicCardOpen } : styles.topicCard}>
                <Pressable onPress={() => setExpanded(isOpen ? null : topic.title)} style={styles.topicHeader}>
                  <View style={[styles.topicIcon, { backgroundColor: `${topic.color}16` }]}>
                    <Icon size={18} color={topic.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicSummary}>{topic.summary}</Text>
                  </View>
                  <ChevronDown size={17} color={colors.inkFaint} style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
                </Pressable>

                {isOpen ? (
                  <View style={styles.stepsWrap}>
                    <View style={styles.warningStrip}>
                      <AlertTriangle size={14} color={colors.peach} />
                      <Text style={styles.warningText}>Use these steps as reference only. Follow dispatcher instructions if you call emergency services.</Text>
                    </View>
                    {topic.steps.map((step, index) => (
                      <View key={`${topic.title}-${index}`} style={styles.stepRow}>
                        <View style={styles.stepNumberWrap}>
                          <Text style={styles.stepNumber}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Pressable onPress={() => navigation.navigate("Main", { screen: "Home" })} style={styles.floatingHome}>
        <Home size={17} color={colors.bg} />
        <Text style={styles.floatingHomeText}>Back home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  emergencyCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.urgentDim, padding: 16 },
  emergencyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 },
  emergencyTitle: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  emergencyText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 8 },
  topicCard: { padding: 15 },
  topicCardOpen: { borderColor: colors.primary },
  topicHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  topicTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  topicSummary: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  stepsWrap: { marginTop: 14, gap: 10 },
  warningStrip: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 11 },
  warningText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 8, flex: 1 },
  stepRow: { flexDirection: "row", alignItems: "flex-start" },
  stepNumberWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 10 },
  stepNumber: { color: colors.primary, fontFamily: fonts.mono, fontSize: 11.5 },
  stepText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, flex: 1, lineHeight: 18, paddingTop: 3 },
  floatingHome: {
    position: "absolute",
    right: 22,
    bottom: 22,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.urgent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 10,
  },
  floatingHomeText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
