import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";
import {
  scheduleAnnualCheckupReminder,
  scheduleDentalVisionReminder,
  cancelDentalVisionReminder,
} from "../services/notifications";

// General, age-banded prompts only — never personalized risk
// assessment. Phrasing always routes back to "ask your doctor."
function screeningPrompts(age: number): string[] {
  const prompts: string[] = [];
  if (age >= 21) prompts.push("Many guidelines recommend cervical screening starting around this age — worth asking your doctor what's right for you.");
  if (age >= 40) prompts.push("Some guidelines suggest starting breast or prostate screening conversations around this age, depending on personal factors.");
  if (age >= 45) prompts.push("Colorectal screening is commonly recommended starting in this age range — worth a conversation with your doctor.");
  if (prompts.length === 0) prompts.push("No specific age-based screening prompts yet — your doctor can advise on what's right for you.");
  return prompts;
}

export default function PreventiveCareScreen() {
  const [lastVisit, setLastVisit] = useState("");
  const [checkupSet, setCheckupSet] = useState(false);
  const [dentalOn, setDentalOn] = useState(false);
  const [age, setAge] = useState("");

  const setCheckupReminder = async () => {
    if (!lastVisit) return;
    await scheduleAnnualCheckupReminder(lastVisit);
    setCheckupSet(true);
  };

  const toggleDental = async () => {
    if (dentalOn) {
      await cancelDentalVisionReminder();
      setDentalOn(false);
    } else {
      await scheduleDentalVisionReminder();
      setDentalOn(true);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Preventive care" subtitle="Gentle nudges, not personalized advice" />
      <View style={{ paddingHorizontal: 28, gap: 20 }}>
        <View>
          <Text style={styles.sectionLabel}>ANNUAL CHECK-UP</Text>
          <TextInput
            value={lastVisit}
            onChangeText={setLastVisit}
            placeholder="Date of last general check-up (YYYY-MM-DD)"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          <PrimaryButton title={checkupSet ? "Reminder set for next year" : "Set annual reminder"} onPress={setCheckupReminder} />
        </View>

        <View>
          <Text style={styles.sectionLabel}>DENTAL & VISION</Text>
          <GhostButton title={dentalOn ? "Remind me every 6 months (on)" : "Remind me every 6 months"} onPress={toggleDental} />
        </View>

        <View>
          <Text style={styles.sectionLabel}>SCREENING PROMPTS</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="Your age"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          {age && Number(age) > 0 && (
            <View style={{ gap: 10 }}>
              {screeningPrompts(Number(age)).map((p, i) => (
                <Card key={i}>
                  <Text style={styles.promptText}>{p}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 10 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, marginBottom: 10 },
  promptText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
});
