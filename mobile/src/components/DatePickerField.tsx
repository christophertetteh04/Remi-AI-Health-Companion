import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
};

const days = ["S", "M", "T", "W", "T", "F", "S"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function DatePickerField({ label, value, onChange, placeholder = "Select date", optional }: Props) {
  const selectedDate = parseDate(value);
  const [visible, setVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const chooseDate = (date: Date) => {
    onChange(toISODate(date));
    setVisible(false);
  };

  const changeMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <Pressable
        onPress={() => {
          setVisibleMonth(selectedDate || new Date());
          setVisible(true);
        }}
        style={styles.field}
      >
        <View style={styles.fieldIcon}>
          <CalendarDays size={16} color={colors.primary} />
        </View>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value || placeholder}</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>SELECT DATE</Text>
                <Text style={styles.sheetTitle}>{label}</Text>
              </View>
              <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
                <X size={17} color={colors.inkFaint} />
              </Pressable>
            </View>

            <View style={styles.monthHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <ChevronLeft size={18} color={colors.ink} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </Text>
              <Pressable onPress={() => changeMonth(1)} style={styles.monthButton}>
                <ChevronRight size={18} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.dayHeader}>
              {days.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.dayHeaderText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarDays.map((item, index) => {
                const active = item.date && value === toISODate(item.date);
                const today = item.date && toISODate(item.date) === toISODate(new Date());
                return (
                  <Pressable key={index} disabled={!item.date} onPress={() => item.date && chooseDate(item.date)} style={[styles.dayCell, active && styles.dayCellActive, today && !active && styles.dayCellToday]}>
                    <Text style={[styles.dayText, !item.date && styles.dayTextEmpty, active && styles.dayTextActive]}>{item.date ? item.date.getDate() : ""}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => chooseDate(new Date())} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Today</Text>
              </Pressable>
              {optional ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setVisible(false);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setVisible(false)} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < firstDay; i += 1) cells.push({ date: null });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ date: new Date(year, month, day) });
  while (cells.length % 7 !== 0) cells.push({ date: null });
  return cells;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  optional: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  field: { minHeight: 50, flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 13 },
  fieldIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 10 },
  fieldText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  placeholder: { color: colors.inkFaint, fontFamily: fonts.body },
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetEyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 5 },
  sheetTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 21 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bg, borderRadius: 14, padding: 8, marginBottom: 12 },
  monthButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  monthTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  dayHeader: { flexDirection: "row", marginBottom: 6 },
  dayHeaderText: { width: `${100 / 7}%`, textAlign: "center", color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  dayCellActive: { backgroundColor: colors.primary },
  dayCellToday: { backgroundColor: colors.primaryDim },
  dayText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  dayTextEmpty: { color: "transparent" },
  dayTextActive: { color: colors.bg },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  secondaryText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
});
