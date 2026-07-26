import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Sparkles } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

export default function WelcomeAnimationScreen({ navigation }: any) {
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 520, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
    ]).start();

    const timer = setTimeout(() => navigation.replace("Main"), 2300);
    return () => clearTimeout(timer);
  }, [navigation, opacity, ring, scale, slide]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.03] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconStage, { opacity, transform: [{ scale }] }]}>
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <View style={styles.icon}>
          <CheckCircle2 size={38} color={colors.bg} />
        </View>
        <View style={styles.spark}>
          <Sparkles size={16} color={colors.peach} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
        <Text style={styles.title}>Welcome onboard</Text>
        <Text style={styles.subtitle}>Your Remi home is ready.</Text>
      </Animated.View>
      <Pressable onPress={() => navigation.replace("Main")} style={styles.skipButton}>
        <Text style={styles.skipText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, paddingHorizontal: 32 },
  iconStage: { width: 132, height: 132, alignItems: "center", justifyContent: "center", marginBottom: 26 },
  ring: { position: "absolute", width: 116, height: 116, borderRadius: 58, backgroundColor: colors.primary },
  icon: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  spark: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.peachDim,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 32, textAlign: "center", letterSpacing: 0 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, textAlign: "center", marginTop: 8 },
  skipButton: { position: "absolute", bottom: 42, paddingHorizontal: 22, paddingVertical: 12 },
  skipText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
});
