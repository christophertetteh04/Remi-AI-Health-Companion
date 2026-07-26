import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, MessageCircle, Pill, Activity, ShieldAlert } from "lucide-react-native";
import { colors } from "../theme/tokens";

import AuthScreen from "../screens/AuthScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import WelcomeAnimationScreen from "../screens/WelcomeAnimationScreen";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import MedsScreen from "../screens/MedsScreen";
import VitalsScreen from "../screens/VitalsScreen";
import EmergencyScreen from "../screens/EmergencyScreen";
import CrisisScreen from "../screens/CrisisScreen";
import PrescriptionScanScreen from "../screens/PrescriptionScanScreen";
import EmergencySettingsScreen from "../screens/EmergencySettingsScreen";
import LabUploadScreen from "../screens/LabUploadScreen";
import BodyMapScreen from "../screens/BodyMapScreen";
import PharmacyLookupScreen from "../screens/PharmacyLookupScreen";
import SamplePhotoScreen from "../screens/SamplePhotoScreen";
import ImagingUploadScreen from "../screens/ImagingUploadScreen";
import ConditionsScreen from "../screens/ConditionsScreen";
import PainCrisisLogScreen from "../screens/PainCrisisLogScreen";
import WomensHealthScreen from "../screens/WomensHealthScreen";
import LifestyleScreen from "../screens/LifestyleScreen";
import PreventiveCareScreen from "../screens/PreventiveCareScreen";
import FirstAidScreen from "../screens/FirstAidScreen";
import DailyInsightsScreen from "../screens/DailyInsightsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkFaint,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home size={18} color={color} /> }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarIcon: ({ color }) => <MessageCircle size={18} color={color} /> }} />
      <Tab.Screen name="Meds" component={MedsScreen} options={{ tabBarIcon: ({ color }) => <Pill size={18} color={color} /> }} />
      <Tab.Screen name="Vitals" component={VitalsScreen} options={{ tabBarIcon: ({ color }) => <Activity size={18} color={color} /> }} />
      <Tab.Screen name="Safety" component={EmergencyScreen} options={{ tabBarIcon: ({ color }) => <ShieldAlert size={18} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator({ hasSession, onboarded }: { hasSession: boolean; onboarded: boolean }) {
  const initialRoute = !hasSession ? "Auth" : !onboarded ? "Onboarding" : "Main";
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeAnimationScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="PrescriptionScan" component={PrescriptionScanScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="EmergencySettings" component={EmergencySettingsScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="LabUpload" component={LabUploadScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="BodyMap" component={BodyMapScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="PharmacyLookup" component={PharmacyLookupScreen} />
        <Stack.Screen name="SamplePhoto" component={SamplePhotoScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="ImagingUpload" component={ImagingUploadScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="Conditions" component={ConditionsScreen} />
        <Stack.Screen name="PainCrisisLog" component={PainCrisisLogScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="WomensHealth" component={WomensHealthScreen} />
        <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
        <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} />
        <Stack.Screen name="FirstAid" component={FirstAidScreen} />
        <Stack.Screen name="DailyInsights" component={DailyInsightsScreen} />
        <Stack.Screen name="Crisis" component={CrisisScreen} options={{ presentation: "fullScreenModal" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
