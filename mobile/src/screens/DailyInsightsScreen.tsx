import React from "react";
import { View, Text, Pressable, Linking, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { ExternalLink } from "lucide-react-native";

// Curated links to official health authorities, not original video/
// content hosted by the app. Topics stay general — never framed as
// personalized advice, even if related to something the user logged.
// Replace/expand this list with real WHO / Ghana Health Service
// article URLs before launch.
const INSIGHTS = [
  {
    title: "Understanding blood pressure",
    description: "What the numbers mean and why they matter.",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
  },
  {
    title: "Malaria prevention basics",
    description: "How malaria spreads and practical prevention steps.",
    url: "https://www.who.int/news-room/fact-sheets/detail/malaria",
  },
  {
    title: "Diabetes: the basics",
    description: "How blood sugar management works day to day.",
    url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
  },
  {
    title: "Building a balanced diet",
    description: "General guidance on healthy eating patterns.",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
  },
  {
    title: "Mental health and wellbeing",
    description: "Recognizing stress and when to seek support.",
    url: "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response",
  },
];

export default function DailyInsightsScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Health insights" subtitle="General reading, from official health sources" />
      <View style={{ paddingHorizontal: 28, gap: 10 }}>
        {INSIGHTS.map((item) => (
          <Pressable key={item.title} onPress={() => Linking.openURL(item.url)}>
            <Card style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
              <ExternalLink size={15} color={colors.inkFaint} style={{ marginTop: 2 }} />
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  description: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3 },
});
