import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Modal, View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { colors, radius, spacing, fonts } from "../theme/tokens";
import { Card } from "../components/UI";
import {
  Activity,
  CalendarDays,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  Languages,
  Leaf,
  LogOut,
  Mail,
  MessageCircle,
  MapPin,
  Pill,
  Phone,
  ShieldPlus,
  Sparkles,
  UserRound,
  Venus,
  X,
} from "lucide-react-native";
import { getRecentActivities, type RecentActivity } from "../services/recentActivity";
import { defaultProfile, loadProfile, Profile } from "../services/profile";
import { supabase } from "../services/supabaseClient";

const homeHeroImage = require("../../assets/images/home-dashboard-hero.jpg");

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName: string) {
  const trimmed = fullName.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "there";
}

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ME";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

const dailyHeroTitles = [
  "A quick check-in keeps your record useful.",
  "Small health notes today can help your next visit.",
  "Log one update now so Remi can keep your story clear.",
  "Your latest symptoms, meds, and vitals belong in one calm place.",
  "A minute with Remi can make tomorrow's care easier.",
  "Keep today simple: check in, track, and move on.",
  "Your health record gets stronger with every small update.",
];

function dailyHeroTitle() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return dailyHeroTitles[dayOfYear % dailyHeroTitles.length];
}

export default function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [profileVisible, setProfileVisible] = useState(false);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const quickEntrance = useRef(new Animated.Value(0)).current;
  const sectionEntrance = useRef(new Animated.Value(0)).current;
  const greeting = timeGreeting();
  const displayName = profile.name || profile.preferredName || "there";
  const avatarInitials = initials(displayName);
  const previewActivities = activities.slice(0, 3);
  const heroTitle = dailyHeroTitle();

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(heroEntrance, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(quickEntrance, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sectionEntrance, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [heroEntrance, quickEntrance, sectionEntrance]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadProfile().then((loadedProfile) => {
        if (mounted) setProfile(loadedProfile);
      });
      getRecentActivities().then((items) => {
        if (mounted) setActivities(items);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const shortcuts = [
    { label: "Conditions", icon: HeartPulse, route: "Conditions", color: colors.primary },
    { label: "Women's", icon: Venus, route: "WomensHealth", color: colors.peach },
    { label: "Lifestyle", icon: Leaf, route: "Lifestyle", color: colors.mint },
    { label: "Care", icon: CalendarCheck, route: "PreventiveCare", color: colors.primary },
    { label: "First aid", icon: ShieldPlus, route: "FirstAid", color: colors.urgent },
    { label: "Insights", icon: Sparkles, route: "DailyInsights", color: colors.peach },
    { label: "Overview", icon: ClipboardList, route: "HealthOverview", color: colors.primary },
  ];

  const activityIcon = (type: RecentActivity["type"]) => {
    if (type === "chat") return MessageCircle;
    if (type === "lab") return FileText;
    if (type === "vitals") return Activity;
    if (type === "medication") return Pill;
    return ClipboardList;
  };

  const signOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase?.auth.signOut();
          await SecureStore.deleteItemAsync("remi_session_token");
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 28 }}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{firstName(displayName)}</Text>
          <Text style={styles.headerSub}>Your health dashboard is ready.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={signOut} style={styles.logoutButton}>
            <LogOut size={17} color={colors.urgent} />
          </Pressable>
          <Pressable onPress={() => setProfileVisible(true)} style={styles.avatar}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>{avatarInitials}</Text>
            <View style={styles.avatarBadge}><UserRound size={9} color={colors.bg} /></View>
          </Pressable>
        </View>
      </View>

      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: heroEntrance,
            transform: [
              { translateY: heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              { scale: heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          },
        ]}
      >
        <Animated.Image
          source={homeHeroImage}
          style={[
            styles.heroImage,
            {
              transform: [
                {
                  scale: scrollY.interpolate({
                    inputRange: [-120, 0, 180],
                    outputRange: [1.08, 1.02, 1],
                    extrapolate: "clamp",
                  }),
                },
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 180],
                    outputRange: [0, -10],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
          resizeMode="cover"
        />
        <View style={styles.heroShade} />
        <Animated.View
          style={[
            styles.heroCopy,
            {
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 160],
                    outputRange: [0, -5],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.heroBadgeText}>TODAY</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Pressable onPress={() => navigation.navigate("Chat")} style={styles.heroButton}>
            <MessageCircle size={14} color={colors.bg} />
            <Text style={styles.heroButtonText}>Start check-in</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.actionRow,
          {
            opacity: quickEntrance,
            transform: [{ translateY: quickEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        <Pressable onPress={() => navigation.navigate("Vitals")} style={styles.quickAction}>
          <View style={styles.quickIcon}><Activity size={16} color={colors.mint} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Vitals</Text>
            <Text style={styles.quickSub}>Log weekly</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("LabUpload")} style={styles.quickAction}>
          <View style={styles.quickIcon}><FileText size={16} color={colors.peach} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Labs</Text>
            <Text style={styles.quickSub}>Upload</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Meds")} style={styles.quickAction}>
          <View style={styles.quickIcon}><Pill size={16} color={colors.primary} /></View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Meds</Text>
            <Text style={styles.quickSub}>Add dose</Text>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.sectionWrap,
          {
            opacity: sectionEntrance,
            transform: [{ translateY: sectionEntrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        <Card style={styles.activityCard}>
          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}><ClipboardList size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>No activity yet</Text>
                <Text style={styles.activitySub}>Conversations, lab uploads, vitals, and medication updates will appear here.</Text>
              </View>
            </View>
          ) : (
            previewActivities.map((item, index) => {
              const Icon = activityIcon(item.type);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => item.route && navigation.navigate(item.route)}
                  style={[styles.activityRow, index === previewActivities.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.activityIcon}><Icon size={15} color={colors.primary} /></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySub}>{item.detail}</Text>
                  </View>
                  {item.route ? <ChevronRight size={15} color={colors.inkFaint} /> : null}
                </Pressable>
              );
            })
          )}
        </Card>
        {activities.length > 0 ? (
          <Pressable onPress={() => navigation.navigate("AllActivities")} style={styles.viewMoreButton}>
            <ClipboardList size={15} color={colors.primary} />
            <Text style={styles.viewMoreText}>View more activity</Text>
            <ChevronRight size={15} color={colors.primary} />
          </Pressable>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CARE TOOLS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutPanel}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.route}
                onPress={() => navigation.navigate(item.route)}
                style={styles.shortcutRow}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: `${item.color}16` }]}>
                  <Icon size={17} color={item.color} />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
      <Modal visible={profileVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.profileBackdrop}>
          <View style={styles.profileSheet}>
            <View style={styles.profileSheetTop}>
              <View style={styles.profileSheetAvatar}>
                <Text style={styles.profileSheetAvatarText}>{avatarInitials}</Text>
              </View>
              <Pressable onPress={() => setProfileVisible(false)} style={styles.profileClose}>
                <X size={17} color={colors.inkFaint} />
              </Pressable>
            </View>

            <Text style={styles.profileEyebrow}>YOUR PROFILE</Text>
            <Text style={styles.profileSheetName}>{profile.name || "Name not added"}</Text>
            <Text style={styles.profileSheetSub}>{profile.preferredName ? `Prefers ${profile.preferredName}` : "Personal details saved on this device"}</Text>

            <View style={styles.profileInfoList}>
              <ProfileInfoRow icon={<Phone size={15} color={colors.primary} />} label="Phone" value={profile.phone || "Not added"} />
              <ProfileInfoRow icon={<Mail size={15} color={colors.primary} />} label="Email" value={profile.email || "Not added"} />
              <ProfileInfoRow icon={<CalendarDays size={15} color={colors.primary} />} label="Date of birth" value={profile.dateOfBirth || "Not added"} />
              <ProfileInfoRow icon={<Languages size={15} color={colors.primary} />} label="Language" value={profile.language || "Not set"} />
              <ProfileInfoRow icon={<MapPin size={15} color={colors.primary} />} label="Location" value={[profile.city, profile.country].filter(Boolean).join(", ") || "Not set"} />
              <ProfileInfoRow icon={<HeartPulse size={15} color={colors.primary} />} label="Health focus" value={profile.ageGroup ? `${profile.ageGroup}: ${profile.healthFocus}` : "Not selected"} />
            </View>

            <Pressable
              onPress={() => {
                setProfileVisible(false);
                navigation.navigate("ProfileEdit");
              }}
              style={styles.profileMoreButton}
            >
              <UserRound size={15} color={colors.bg} />
              <Text style={styles.profileMoreText}>View more</Text>
              <ChevronRight size={15} color={colors.bg} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </Animated.ScrollView>
  );
}

function ProfileInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.profileInfoRow}>
      <View style={styles.profileInfoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.profileInfoLabel}>{label}</Text>
        <Text style={styles.profileInfoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 54 },
  greeting: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  name: { color: colors.ink, fontFamily: fonts.display, fontSize: 25 },
  headerSub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoutButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.urgentDim, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(220,38,38,0.22)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  avatarBadge: { position: "absolute", right: -1, bottom: -1, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  profileBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.46)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  profileSheet: { width: "100%", maxWidth: 430, backgroundColor: colors.surface, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 20, shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  profileSheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  profileSheetAvatar: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  profileSheetAvatarText: { color: colors.bg, fontFamily: fonts.display, fontSize: 21 },
  profileClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  profileEyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 6 },
  profileSheetName: { color: colors.ink, fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  profileSheetSub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 5 },
  profileInfoList: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginTop: 16, overflow: "hidden" },
  profileInfoRow: { flexDirection: "row", alignItems: "center", minHeight: 58, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  profileInfoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  profileInfoLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  profileInfoValue: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  profileMoreButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 999, marginTop: 16 },
  profileMoreText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  heroCard: { height: 190, marginHorizontal: spacing.xl, marginTop: 18, borderRadius: 18, overflow: "hidden", backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.72)", shadowColor: "#0F172A", shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16,32,51,0.18)" },
  heroCopy: { position: "absolute", left: 12, right: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.82)", padding: 14, shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroBadgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 5 },
  heroTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 18, lineHeight: 23, maxWidth: 280 },
  heroButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, marginTop: 11, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  heroButtonText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.xl, marginTop: 12 },
  quickAction: { flex: 1, minHeight: 66, backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 10, paddingVertical: 10, justifyContent: "space-between" },
  quickIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  quickSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  sectionWrap: { paddingHorizontal: spacing.xl, marginTop: 22 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 10 },
  activityCard: { paddingVertical: 4, paddingHorizontal: 14 },
  emptyActivity: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  emptyIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  activityTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  activitySub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2, lineHeight: 15 },
  viewMoreButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primaryDim, borderRadius: 999, marginTop: 10 },
  viewMoreText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  shortcutPanel: { gap: 9, paddingRight: 2 },
  shortcutRow: { width: 92, minHeight: 82, backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 10, alignItems: "center", justifyContent: "center" },
  shortcutIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  shortcutText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 11.5, textAlign: "center" },
});
