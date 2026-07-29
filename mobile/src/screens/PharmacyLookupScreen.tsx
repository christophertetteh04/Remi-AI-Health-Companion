import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Linking, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { colors, fonts } from "../theme/tokens";
import { Card } from "../components/UI";
import { authHeader } from "../services/api";
import { ArrowUpRight, Building2, Clock3, LocateFixed, MapPin, Navigation, RefreshCcw } from "lucide-react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type Pharmacy = { name: string; address: string; lat: number; lng: number; openNow: boolean | null };

export default function PharmacyLookupScreen() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNearby = async () => {
    setLoading(true);
    setFallback(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFallback("We need location access to find nearby pharmacies — you can also just ask your community pharmacy directly.");
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const res = await fetch(
        `${API_BASE_URL}/pharmacies/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
        { headers: await authHeader() },
      );
      const data = await res.json();
      setPharmacies(data.results || []);
      setFallback(data.fallbackMessage);
    } catch {
      setFallback("We couldn't reach the pharmacy search right now — please try again shortly.");
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearby();
  }, []);

  const openDirections = (p: Pharmacy) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LocateFixed size={24} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>PHARMACY LOOKUP</Text>
        <Text style={styles.title}>Nearby pharmacies</Text>
        <Text style={styles.subtitle}>Find nearby options and open directions when you are ready to call or visit.</Text>
      </View>

      <View style={styles.summaryPanel}>
        <View style={styles.summaryIcon}>
          <Navigation size={18} color={colors.mint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{loading ? "Searching your area" : pharmacies.length ? `${pharmacies.length} option${pharmacies.length === 1 ? "" : "s"} nearby` : "No listings found"}</Text>
          <Text style={styles.summaryText}>{loading ? "Checking your location and pharmacy listings." : "Listings can change, so call ahead before making a trip."}</Text>
        </View>
        <Pressable onPress={loadNearby} disabled={loading} style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Refresh nearby pharmacies">
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCcw size={16} color={colors.primary} />}
        </Pressable>
      </View>

      {fallback ? (
        <View style={styles.fallbackPanel}>
          <Building2 size={17} color={colors.peach} />
          <Text style={styles.fallback}>{fallback}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {loading && pharmacies.length === 0 && [0, 1, 2].map((item) => <LoadingRow key={item} />)}
        {pharmacies.map((p, i) => (
          <Pressable key={`${p.name}-${i}`} onPress={() => openDirections(p)} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.pharmacyCard}>
              <View style={styles.pinWrap}>
                <MapPin size={17} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{p.name}</Text>
                  <ArrowUpRight size={16} color={colors.inkFaint} />
                </View>
                <Text style={styles.address}>{p.address}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.statusPill, p.openNow === true && styles.openPill, p.openNow === false && styles.closedPill]}>
                    <Clock3 size={12} color={p.openNow === false ? colors.peach : colors.mint} />
                    <Text style={[styles.openStatus, { color: p.openNow === false ? colors.peach : colors.mint }]}>
                      {p.openNow === null ? "Hours unavailable" : p.openNow ? "Open now" : "Closed now"}
                    </Text>
                  </View>
                  <Text style={styles.directionsText}>Directions</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function LoadingRow() {
  return (
    <View style={styles.loadingCard}>
      <View style={styles.loadingIcon} />
      <View style={{ flex: 1 }}>
        <View style={styles.loadingLineWide} />
        <View style={styles.loadingLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 34 },
  header: { marginBottom: 18 },
  headerIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 320 },
  summaryPanel: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12, shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  summaryText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  refreshButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  fallbackPanel: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 13, padding: 13, marginBottom: 12 },
  fallback: { color: colors.peach, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginLeft: 9, flex: 1 },
  list: { gap: 10 },
  pharmacyCard: { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  pressed: { opacity: 0.78 },
  pinWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14.5, lineHeight: 20, flex: 1 },
  address: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.mintDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  openPill: { backgroundColor: colors.mintDim },
  closedPill: { backgroundColor: colors.peachDim },
  openStatus: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  directionsText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  loadingCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  loadingIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceRaised, marginRight: 12 },
  loadingLineWide: { width: "72%", height: 12, borderRadius: 6, backgroundColor: colors.surfaceRaised, marginBottom: 8 },
  loadingLine: { width: "48%", height: 10, borderRadius: 5, backgroundColor: colors.surfaceRaised },
});
