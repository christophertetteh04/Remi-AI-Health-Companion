import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Linking, Pressable, StyleSheet } from "react-native";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { MapPin } from "lucide-react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type Pharmacy = { name: string; address: string; lat: number; lng: number; openNow: boolean | null };

export default function PharmacyLookupScreen() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFallback("We need location access to find nearby pharmacies — you can also just ask your community pharmacy directly.");
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const token = await SecureStore.getItemAsync("remi_session_token");
      try {
        const res = await fetch(
          `${API_BASE_URL}/pharmacies/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        setPharmacies(data.results || []);
        setFallback(data.fallbackMessage);
      } catch {
        setFallback("We couldn't reach the pharmacy search right now — please try again shortly.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDirections = (p: Pharmacy) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Nearby pharmacies" subtitle="Where you might find your medication" />
      <View style={{ paddingHorizontal: 28, gap: 10 }}>
        {loading && <Text style={styles.loading}>Looking nearby…</Text>}
        {!loading && fallback && <Text style={styles.fallback}>{fallback}</Text>}
        {pharmacies.map((p, i) => (
          <Pressable key={i} onPress={() => openDirections(p)}>
            <Card style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <MapPin size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.address}>{p.address}</Text>
                {p.openNow !== null && (
                  <Text style={[styles.openStatus, { color: p.openNow ? colors.mint : colors.peach }]}>
                    {p.openNow ? "Open now" : "Closed now"}
                  </Text>
                )}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  fallback: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  name: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  address: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  openStatus: { fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
});
