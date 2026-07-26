import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BookOpen, ExternalLink, HeartPulse, Home, ShieldCheck, Sparkles, Utensils, Wind } from "lucide-react-native";
import { Card } from "../components/UI";
import { colors, fonts } from "../theme/tokens";

const INSIGHTS = [
  {
    title: "Understanding blood pressure",
    category: "Vitals",
    description: "What the numbers mean and why consistent monitoring matters.",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    icon: HeartPulse,
    color: colors.primary,
    readTime: "4 min",
  },
  {
    title: "Malaria prevention basics",
    category: "Safety",
    description: "How malaria spreads and practical prevention habits.",
    url: "https://www.who.int/news-room/fact-sheets/detail/malaria",
    icon: ShieldCheck,
    color: colors.mint,
    readTime: "5 min",
  },
  {
    title: "Diabetes: the basics",
    category: "Vitals",
    description: "How blood sugar management works day to day.",
    url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
    icon: HeartPulse,
    color: colors.urgent,
    readTime: "6 min",
  },
  {
    title: "Building a balanced diet",
    category: "Lifestyle",
    description: "General guidance on healthy eating patterns.",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    icon: Utensils,
    color: colors.peach,
    readTime: "4 min",
  },
  {
    title: "Mental health and wellbeing",
    category: "Wellbeing",
    description: "Recognizing stress and knowing when to seek support.",
    url: "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response",
    icon: Wind,
    color: colors.primary,
    readTime: "5 min",
  },
];

const CATEGORIES = ["All", "Vitals", "Safety", "Lifestyle", "Wellbeing"] as const;

export default function DailyInsightsScreen({ navigation }: any) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const visibleInsights = category === "All" ? INSIGHTS : INSIGHTS.filter((item) => item.category === category);
  const featured = visibleInsights[0] || INSIGHTS[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 126 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>INSIGHTS</Text>
            <Text style={styles.title}>Health reading that feels useful</Text>
            <Text style={styles.subtitle}>Curated general education from official health sources. Keep decisions clinician-led.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Sparkles size={24} color={colors.peach} />
          </View>
        </View>

        <View style={styles.content}>
          <Pressable onPress={() => Linking.openURL(featured.url)}>
            <Card style={styles.featuredCard}>
              <View style={styles.featuredTop}>
                <View style={[styles.featuredIcon, { backgroundColor: `${featured.color}16` }]}>
                  <featured.icon size={20} color={featured.color} />
                </View>
                <View style={styles.readBadge}>
                  <BookOpen size={13} color={colors.primary} />
                  <Text style={styles.readBadgeText}>{featured.readTime}</Text>
                </View>
              </View>
              <Text style={styles.featuredLabel}>FEATURED</Text>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <Text style={styles.featuredText}>{featured.description}</Text>
              <View style={styles.sourceRow}>
                <Text style={styles.sourceText}>WHO source</Text>
                <ExternalLink size={14} color={colors.primary} />
              </View>
            </Card>
          </Pressable>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((item) => (
              <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryChipActive]}>
                <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>OFFICIAL SOURCES</Text>
            <Text style={styles.sectionHint}>{visibleInsights.length} article{visibleInsights.length === 1 ? "" : "s"}</Text>
          </View>

          {visibleInsights.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable key={item.title} onPress={() => Linking.openURL(item.url)}>
                <Card style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: `${item.color}16` }]}>
                    <Icon size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                      <Text style={styles.cardReadTime}>{item.readTime}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                  <ExternalLink size={15} color={colors.inkFaint} />
                </Card>
              </Pressable>
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
  eyebrow: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 260 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  featuredCard: { padding: 18, backgroundColor: colors.surface },
  featuredTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  featuredIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  readBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  readBadgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  featuredLabel: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  featuredTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, marginTop: 5 },
  featuredText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  sourceRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginTop: 16 },
  sourceText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: { minHeight: 38, borderRadius: 999, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  categoryChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  categoryText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12 },
  categoryTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  sectionHint: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 11.5 },
  insightCard: { flexDirection: "row", alignItems: "flex-start", padding: 15 },
  insightIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  cardCategory: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  cardReadTime: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  cardDescription: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  floatingHome: {
    position: "absolute",
    right: 22,
    bottom: 22,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.primary,
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
