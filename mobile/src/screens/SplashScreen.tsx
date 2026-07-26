import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Activity, HeartPulse } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [opacity, pulse, scale]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.04] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.markWrap, { opacity, transform: [{ scale }] }]}>
        <Animated.View style={[styles.pulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
        <View style={styles.mark}>
          <HeartPulse size={30} color={colors.bg} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.logo, { opacity }]}>Remi</Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity }]}>Your health companion</Animated.Text>
      <View style={styles.loadingRow}>
        <Activity size={14} color={colors.primary} />
        <Text style={styles.loadingText}>Getting things ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, paddingHorizontal: 32 },
  markWrap: { width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: 112, height: 112, borderRadius: 56, backgroundColor: colors.primary },
  mark: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logo: { color: colors.ink, fontFamily: fonts.display, fontSize: 34, marginTop: 18, letterSpacing: 0 },
  tagline: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, marginTop: 6 },
  loadingRow: { position: "absolute", bottom: 54, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12.5 },
});
