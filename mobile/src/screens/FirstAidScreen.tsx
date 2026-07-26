import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { ChevronDown } from "lucide-react-native";

// Static reference content only — no AI generation, no
// personalization. Adapted from standard first-aid guidance
// (American Red Cross / WHO basic first aid guidelines). This is
// reference material to read in an emergency, not a substitute for
// emergency services — see the urgent messaging pattern used
// elsewhere in the app (call 112 first when in doubt).
const TOPICS = [
  {
    title: "Choking",
    steps: [
      "Ask 'Are you choking?' — if they can cough or speak, encourage coughing.",
      "If they can't breathe, cough, or speak: give 5 back blows between the shoulder blades with the heel of your hand.",
      "If that doesn't work, give 5 abdominal thrusts (Heimlich maneuver).",
      "Alternate 5 back blows and 5 abdominal thrusts until the object clears or they lose consciousness.",
      "If they lose consciousness, call 112 immediately and begin CPR if trained.",
    ],
  },
  {
    title: "Burns",
    steps: [
      "Cool the burn under cool (not ice-cold) running water for 10–20 minutes.",
      "Remove tight items (rings, watches) near the burn before swelling starts.",
      "Cover loosely with a clean, non-fluffy cloth or cling film — don't use ice, butter, or ointments.",
      "Don't burst any blisters.",
      "Seek medical care for burns larger than a hand, on the face/hands/genitals, or if the skin looks white/charred.",
    ],
  },
  {
    title: "Bleeding",
    steps: [
      "Apply firm, direct pressure to the wound with a clean cloth or bandage.",
      "Keep pressing continuously — don't lift the cloth to check.",
      "If possible, raise the injured area above the level of the heart.",
      "Once bleeding slows, bandage firmly (not so tight it cuts off circulation).",
      "Seek emergency care for deep wounds, spurting blood, or bleeding that won't stop after 10 minutes of pressure.",
    ],
  },
  {
    title: "Fainting",
    steps: [
      "Lay the person flat and raise their legs about 30cm (12in) if possible.",
      "Loosen any tight clothing around the neck.",
      "Check they're breathing — if not, call 112 and begin CPR if trained.",
      "Once they come round, keep them lying down for a few minutes before slowly sitting up.",
      "Seek medical care if they don't regain consciousness within a minute, or if fainting is recurrent or follows a head injury.",
    ],
  },
];

export default function FirstAidScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="First aid" subtitle="Reference only — call 112 first if you're unsure" />
      <View style={{ paddingHorizontal: 28, gap: 10 }}>
        {TOPICS.map((topic) => {
          const isOpen = expanded === topic.title;
          return (
            <Card key={topic.title}>
              <Pressable onPress={() => setExpanded(isOpen ? null : topic.title)} style={styles.topicHeader}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <ChevronDown size={16} color={colors.inkFaint} style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
              </Pressable>
              {isOpen && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {topic.steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{i + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topicHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topicTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14.5 },
  stepRow: { flexDirection: "row", gap: 10 },
  stepNumber: { color: colors.primary, fontFamily: fonts.mono, fontSize: 11.5, width: 16 },
  stepText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, flex: 1, lineHeight: 18 },
});
