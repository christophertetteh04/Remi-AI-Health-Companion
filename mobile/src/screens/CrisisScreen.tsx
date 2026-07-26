import React from "react";
import { View, Text, Linking, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Phone, Heart } from "lucide-react-native";
import { GhostButton } from "../components/UI";

export default function CrisisScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 36 }}>
      <View style={{ flex: 1 }}>
        <View style={styles.iconWrap}><Heart size={22} color={colors.urgent} /></View>
        <Text style={styles.title}>I'm really glad you told me this.</Text>
        <Text style={styles.body}>What you're feeling matters, and you don't have to go through it alone.</Text>

        <Pressable onPress={() => Linking.openURL("tel:112")} style={styles.card}>
          <Phone size={17} color={colors.urgent} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Call 112 now</Text>
            <Text style={styles.cardSub}>Ghana's emergency line — if you're in immediate danger</Text>
          </View>
        </Pressable>

        <View style={[styles.card, { marginBottom: 28 }]}>
          <Phone size={17} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Mental Health Authority helpline</Text>
            <Text style={styles.cardSub}>Available any time, day or night</Text>
          </View>
        </View>

        <Text style={styles.body}>Is there someone you trust who could be with you right now?</Text>
      </View>
      <GhostButton title="Back to check-in" onPress={() => navigation.navigate("Chat")} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 52, height: 52, borderRadius: 20, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 25, marginBottom: 12, lineHeight: 31 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, marginBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 12 },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  cardSub: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});
