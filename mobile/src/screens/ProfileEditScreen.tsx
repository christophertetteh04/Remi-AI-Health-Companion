import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Activity, ArrowLeft, BriefcaseBusiness, Check, HeartPulse, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import { defaultProfile, loadProfile, Profile, saveProfile } from "../services/profile";
import { colors, fonts, spacing } from "../theme/tokens";

const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"];
const languageOptions = ["English", "Twi", "Ga", "Ewe", "French"];
const ageGroups = [
  {
    value: "Teens and young adults",
    range: "Ages 13-25",
    focus: "Mental health support, fitness tracking, and period or cycle monitoring.",
    icon: <HeartPulse size={17} color={colors.primary} />,
  },
  {
    value: "Working adults",
    range: "Ages 26-60",
    focus: "Stress management, chronic disease prevention, and daily step or sleep goals.",
    icon: <BriefcaseBusiness size={17} color={colors.primary} />,
  },
  {
    value: "Older adults",
    range: "Ages 60+",
    focus: "Medication reminders, fall detection, and easy vital-sign tracking for doctor visits.",
    icon: <Activity size={17} color={colors.primary} />,
  },
];

export default function ProfileEditScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const allowLeaveRef = useRef(false);

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  useEffect(() => {
    (async () => {
      const loaded = await loadProfile();
      setProfile(loaded);
      setSavedProfile(loaded);
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (!hasChanges || allowLeaveRef.current) return;
      event.preventDefault();
      showLeaveAlert(() => {
        allowLeaveRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [hasChanges, navigation]);

  const updateProfile = (key: keyof Profile, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const showLeaveAlert = (discard: () => void) => {
    Alert.alert("Discard profile changes?", "You have unsaved profile updates. Save before leaving, or discard the changes.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: discard },
    ]);
  };

  const leave = () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }
    showLeaveAlert(() => {
      allowLeaveRef.current = true;
      navigation.goBack();
    });
  };

  const save = async () => {
    setSaving(true);
    const cleanProfile = {
      ...profile,
      name: profile.name.trim(),
      preferredName: profile.preferredName.trim(),
      phone: profile.phone.trim(),
      email: profile.email.trim(),
      dateOfBirth: profile.dateOfBirth.trim(),
      ageGroup: profile.ageGroup.trim(),
      healthFocus: profile.healthFocus.trim(),
      city: profile.city.trim(),
      country: profile.country.trim(),
    };
    await saveProfile(cleanProfile);
    setProfile(cleanProfile);
    setSavedProfile(cleanProfile);
    setSaving(false);
    allowLeaveRef.current = true;
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={leave} style={styles.backButton}>
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <View style={styles.badge}>
            <UserRound size={13} color={colors.primary} />
            <Text style={styles.badgeText}>{hasChanges ? "Unsaved" : "Saved"}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.name || profile.preferredName || "R")}</Text>
          </View>
          <Text style={styles.eyebrow}>PROFILE</Text>
          <Text style={styles.title}>Edit your Remi profile.</Text>
          <Text style={styles.subtitle}>These details help Remi personalize greetings, contact information, and account preferences.</Text>
        </View>

        <Section icon={<UserRound size={17} color={colors.primary} />} title="Personal information">
          <Input label="Full name" value={profile.name} onChangeText={(value) => updateProfile("name", value)} placeholder="e.g. Ama Owusu" autoCapitalize="words" />
          <Input label="Preferred name" value={profile.preferredName} onChangeText={(value) => updateProfile("preferredName", value)} placeholder="e.g. Ama" autoCapitalize="words" />
          <DatePickerField label="Date of birth" value={profile.dateOfBirth} onChange={(value) => updateProfile("dateOfBirth", value)} placeholder="Select date of birth" optional />
          <ChoiceRow label="Gender" value={profile.gender} options={genderOptions} onSelect={(value) => updateProfile("gender", value)} />
        </Section>

        <Section icon={<HeartPulse size={17} color={colors.primary} />} title="Health app focus">
          <Text style={styles.sectionHint}>Choose the age group that best fits this profile so Remi can emphasize the most useful tools.</Text>
          {ageGroups.map((group) => {
            const active = profile.ageGroup === group.value;
            return (
              <Pressable
                key={group.value}
                onPress={() => setProfile((current) => ({ ...current, ageGroup: group.value, healthFocus: group.focus }))}
                style={[styles.ageCard, active && styles.ageCardActive]}
              >
                <View style={styles.ageIcon}>{group.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ageTitle}>{group.value}</Text>
                  <Text style={styles.ageRange}>{group.range}</Text>
                  <Text style={styles.ageFocus}>{group.focus}</Text>
                </View>
                <View style={[styles.ageCheck, active && styles.ageCheckActive]}>{active ? <Check size={13} color={colors.bg} /> : null}</View>
              </Pressable>
            );
          })}
        </Section>

        <Section icon={<Phone size={17} color={colors.primary} />} title="Contact">
          <Input label="Phone number" value={profile.phone} onChangeText={(value) => updateProfile("phone", value)} placeholder="+233 ..." keyboardType="phone-pad" />
          <Input label="Email address" value={profile.email} onChangeText={(value) => updateProfile("email", value)} placeholder="name@email.com" keyboardType="email-address" autoCapitalize="none" />
          <ChoiceRow label="Preferred language" value={profile.language} options={languageOptions} onSelect={(value) => updateProfile("language", value)} />
        </Section>

        <Section icon={<MapPin size={17} color={colors.primary} />} title="Location">
          <Input label="City" value={profile.city} onChangeText={(value) => updateProfile("city", value)} placeholder="e.g. Accra" autoCapitalize="words" />
          <Input label="Country" value={profile.country} onChangeText={(value) => updateProfile("country", value)} placeholder="e.g. Ghana" autoCapitalize="words" />
        </Section>

        <View style={styles.note}>
          <ShieldCheck size={15} color={colors.mint} />
          <Text style={styles.noteText}>Profile details are saved securely on this device and used to personalize Remi. Medical records stay in their dedicated sections.</Text>
        </View>

        <PrimaryButton title={saving ? "Saving..." : "Save profile"} onPress={save} style={{ opacity: saving ? 0.62 : 1 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Input({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkFaint} style={styles.input} {...props} />
    </View>
  );
}

function ChoiceRow({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (value: string) => void }) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable key={option} onPress={() => onSelect(option)} style={[styles.choicePill, active && styles.choicePillActive]}>
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option}</Text>
              {active ? <Check size={12} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  avatar: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  avatarText: { color: colors.bg, fontFamily: fonts.display, fontSize: 21 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  sectionHint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 15, paddingVertical: 13, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 48 },
  choiceBlock: { marginBottom: 12 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choicePill: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12 },
  choicePillActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  choiceText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12 },
  choiceTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  ageCard: { minHeight: 86, flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 13, marginBottom: 10 },
  ageCardActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  ageIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 },
  ageTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  ageRange: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 3 },
  ageFocus: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 5 },
  ageCheck: { width: 23, height: 23, borderRadius: 8, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  ageCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
