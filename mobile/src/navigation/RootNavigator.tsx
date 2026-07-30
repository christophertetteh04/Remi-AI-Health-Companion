import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Activity, Home as HomeIcon, MessageCircle, Pill, Settings as SettingsIcon, ShieldAlert } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { isDarkAppearanceEnabled } from "../services/largeText";

import AuthScreen from "../screens/AuthScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import WelcomeAnimationScreen from "../screens/WelcomeAnimationScreen";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import MedsScreen from "../screens/MedsScreen";
import VitalsScreen from "../screens/VitalsScreen";
import EmergencyScreen from "../screens/EmergencyScreen";
import CrisisScreen from "../screens/CrisisScreen";
import PrescriptionScanScreen from "../screens/PrescriptionScannerScreen";
import EmergencySettingsScreen from "../screens/EmergencySettingsScreen";
import LabUploadScreen from "../screens/LabUploadScreen";
import BodyMapScreen from "../screens/BodyMapScreen";
import PharmacyLookupScreen from "../screens/PharmacyLookupScreen";
import SamplePhotoScreen from "../screens/SamplePhotoScreen";
import ImagingUploadScreen from "../screens/ImagingUploadScreen";
import ConditionsScreen from "../screens/ConditionsScreen";
import ConditionEducationScreen from "../screens/ConditionEducationScreen";
import ConditionPlansScreen from "../screens/ConditionPlansScreen";
import ArtAdherenceScreen from "../screens/ArtAdherenceScreen";
import AsthmaRespiratoryScreen from "../screens/AsthmaRespiratoryScreen";
import KidneyFunctionScreen from "../screens/KidneyFunctionScreen";
import CholesterolTrackingScreen from "../screens/CholesterolTrackingScreen";
import ThyroidTrackingScreen from "../screens/ThyroidTrackingScreen";
import PainCrisisLogScreen from "../screens/PainCrisisLogScreen";
import WomensHealthScreen from "../screens/WomensHealthScreen";
import LifestyleScreen from "../screens/LifestyleScreen";
import PreventiveCareScreen from "../screens/PreventiveCareScreen";
import FirstAidScreen from "../screens/FirstAidScreen";
import DailyInsightsScreen from "../screens/DailyInsightsScreen";
import HealthOverviewScreen from "../screens/HealthOverviewScreen";
import AllActivitiesScreen from "../screens/AllActivitiesScreen";
import ActivityDetailScreen from "../screens/ActivityDetailScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AppLockSettingsScreen from "../screens/AppLockSettingsScreen";
import QuietHoursSettingsScreen from "../screens/QuietHoursSettingsScreen";
import PreventiveReminderSettingsScreen from "../screens/PreventiveReminderSettingsScreen";
import HydrationReminderSettingsScreen from "../screens/HydrationReminderSettingsScreen";
import HealthReminderSettingsScreen from "../screens/HealthReminderSettingsScreen";
import ProfileEditScreen from "../screens/ProfileEditScreen";
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import HelpCenterScreen from "../screens/HelpCenterScreen";
import ExportHealthDataScreen from "../screens/ExportHealthDataScreen";
import DeleteAccountDataScreen from "../screens/DeleteAccountDataScreen";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcons = {
  Chat: MessageCircle,
  Meds: Pill,
  Home: HomeIcon,
  Vitals: Activity,
  Safety: ShieldAlert,
  Settings: SettingsIcon,
};

function AnimatedTabButton({
  focused,
  label,
  onPress,
  routeName,
}: {
  focused: boolean;
  label: string;
  onPress: () => void;
  routeName: string;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const Icon = tabIcons[routeName as keyof typeof tabIcons] ?? HomeIcon;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      tension: 130,
      friction: 12,
    }).start();
  }, [focused, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  const iconColor = focused ? colors.bg : colors.inkFaint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabMotion, { transform: [{ translateY }, { scale }] }]}>
        <Animated.View style={[styles.activeIndicator, { opacity: progress, transform: [{ scaleX: indicatorScale }] }]} />
        <View style={styles.activePill}>
          <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
            <Icon size={19} color={iconColor} strokeWidth={focused ? 2.7 : 2.2} />
          </View>
          <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function RemiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={styles.tabShell}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <AnimatedTabButton
              key={route.key}
              focused={focused}
              label={String(label)}
              onPress={onPress}
              routeName={route.name}
            />
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <RemiTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Meds" component={MedsScreen} />
      <Tab.Screen name="Vitals" component={VitalsScreen} />
      <Tab.Screen name="Safety" component={EmergencyScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator({ hasSession, onboarded, displayVersion }: { hasSession: boolean; onboarded: boolean; displayVersion?: number }) {
  const initialRoute = !hasSession ? "Auth" : !onboarded ? "Onboarding" : "Main";
  const navigationTheme = {
    dark: isDarkAppearanceEnabled(),
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.ink,
      border: colors.hairline,
      notification: colors.urgent,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" as const },
      medium: { fontFamily: "System", fontWeight: "500" as const },
      bold: { fontFamily: "System", fontWeight: "700" as const },
      heavy: { fontFamily: "System", fontWeight: "800" as const },
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} initialRouteName={initialRoute}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeAnimationScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AllActivities" component={AllActivitiesScreen} />
        <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
        <Stack.Screen name="AppLockSettings" component={AppLockSettingsScreen} />
        <Stack.Screen name="QuietHoursSettings" component={QuietHoursSettingsScreen} />
        <Stack.Screen name="PreventiveReminderSettings" component={PreventiveReminderSettingsScreen} />
        <Stack.Screen name="HydrationReminderSettings" component={HydrationReminderSettingsScreen} />
        <Stack.Screen name="HealthReminderSettings" component={HealthReminderSettingsScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="ExportHealthData" component={ExportHealthDataScreen} />
        <Stack.Screen name="DeleteAccountData" component={DeleteAccountDataScreen} />
        <Stack.Screen name="PrescriptionScan" component={PrescriptionScanScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="EmergencySettings" component={EmergencySettingsScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="LabUpload" component={LabUploadScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="BodyMap" component={BodyMapScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="PharmacyLookup" component={PharmacyLookupScreen} />
        <Stack.Screen name="SamplePhoto" component={SamplePhotoScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="ImagingUpload" component={ImagingUploadScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="Conditions" component={ConditionsScreen} />
        <Stack.Screen name="ConditionEducation" component={ConditionEducationScreen} />
        <Stack.Screen name="ConditionPlans" component={ConditionPlansScreen} />
        <Stack.Screen name="ArtAdherence" component={ArtAdherenceScreen} />
        <Stack.Screen name="AsthmaRespiratory" component={AsthmaRespiratoryScreen} />
        <Stack.Screen name="KidneyFunction" component={KidneyFunctionScreen} />
        <Stack.Screen name="CholesterolTracking" component={CholesterolTrackingScreen} />
        <Stack.Screen name="ThyroidTracking" component={ThyroidTrackingScreen} />
        <Stack.Screen name="PainCrisisLog" component={PainCrisisLogScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="WomensHealth" component={WomensHealthScreen} />
        <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
        <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} />
        <Stack.Screen name="FirstAid" component={FirstAidScreen} />
        <Stack.Screen name="DailyInsights" component={DailyInsightsScreen} />
        <Stack.Screen name="HealthOverview" component={HealthOverviewScreen} />
        <Stack.Screen name="Crisis" component={CrisisScreen} options={{ presentation: "fullScreenModal" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
  },
  tabBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(216,225,234,0.88)",
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: "#14304A",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  tabMotion: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  activePill: {
    width: "94%",
    minHeight: 47,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tabIconWrapActive: {
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(37,99,235,0.45)",
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  tabLabel: {
    color: colors.inkFaint,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9.8,
    lineHeight: 12,
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.primary,
  },
  activeIndicator: {
    width: 20,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
