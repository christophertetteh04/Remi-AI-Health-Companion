import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Activity, AlertTriangle, ArrowLeft, BookOpen, CalendarClock, CheckCircle2, Pill, ShieldCheck, Stethoscope } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

type EducationContent = {
  title: string;
  subtitle: string;
  overview: string;
  symptoms: string[];
  medication: string[];
  tracking: string[];
  urgent: string[];
};

const HEPATITIS_CONTENT: EducationContent = {
  title: "Hepatitis",
  subtitle: "Liver health basics",
  overview: "Hepatitis means inflammation of the liver. Different viruses can cause hepatitis A, B, C, D, or E. Some types are short-term, while hepatitis B, C, and D can become long-term for some people and need regular clinical follow-up.",
  symptoms: ["Yellow eyes or skin", "Dark urine or pale stool", "Belly pain, nausea, or vomiting", "Unusual tiredness", "Fever, poor appetite, or joint pain"],
  medication: ["Take antiviral or other medicines exactly as prescribed if your clinician gives them.", "Do not stop treatment early without asking your clinician, even if you feel better.", "Ask before taking alcohol, herbal products, or extra pain medicines because some can stress the liver."],
  tracking: ["Keep lab dates for liver enzymes and viral testing.", "Record symptoms, medication side effects, and exposure questions.", "Ask your clinician about vaccination and whether close contacts need testing or protection."],
  urgent: ["Confusion, fainting, or severe sleepiness", "Vomiting blood or black stools", "Severe belly swelling or pain", "Yellowing that is getting worse quickly"],
};

const DIABETES_CONTENT: EducationContent = {
  title: "Diabetes",
  subtitle: "Blood sugar support",
  overview: "Diabetes affects how the body uses glucose for energy. Type 1 diabetes usually requires insulin. Type 2 diabetes often involves insulin resistance. Gestational diabetes happens during pregnancy and needs close prenatal follow-up.",
  symptoms: ["Frequent urination", "Increased thirst or hunger", "Blurred vision", "Fatigue or mood changes", "Slow-healing cuts, tingling, nausea, vomiting, or belly pain"],
  medication: ["Take insulin or diabetes medicines exactly as prescribed.", "Skipping medicine can make blood sugar harder to control and may increase risk of serious complications.", "If side effects, cost, food access, or dosing times are hard, ask your care team for a safer plan instead of stopping on your own."],
  tracking: ["Log glucose readings and bring patterns to appointments.", "Keep A1C, blood pressure, cholesterol, kidney, eye, and foot checks on schedule.", "Record low blood sugar episodes, missed doses, meals, activity, and illness days."],
  urgent: ["Severe vomiting, belly pain, deep breathing, fruity breath, or confusion", "Very low blood sugar that does not improve with fast sugar", "Chest pain, stroke-like symptoms, or fainting", "During pregnancy, reduced baby movement or concerning symptoms"],
};

const EDUCATION: Record<string, EducationContent> = {
  sickle_cell: {
    title: "Sickle cell disease",
    subtitle: "Pain crisis and hydration support",
    overview: "Sickle cell disease affects red blood cells and can reduce oxygen delivery. Triggers like dehydration, infection, cold exposure, or stress may contribute to pain crises for some people.",
    symptoms: ["New or worsening pain", "Fever or signs of infection", "Shortness of breath or chest pain", "Swelling of hands or feet", "Severe tiredness, weakness, or yellowing of the eyes"],
    medication: ["Take prescribed medicines, such as hydroxyurea or infection-prevention medicines, the way your clinician instructed.", "Consistent treatment can reduce complications for some people and helps your care team judge what is working.", "Do not stop or change doses without clinical advice."],
    tracking: ["Log pain location, severity, triggers, fluids, and medicines taken.", "Keep vaccinations, lab checks, and specialist visits current.", "Ask your clinician when to seek urgent care for pain that is not improving."],
    urgent: ["Fever", "Chest pain or trouble breathing", "Severe headache, weakness, or confusion", "Pain that is severe or not responding to your plan"],
  },
  hiv_art_adherence: {
    title: "HIV / ART adherence",
    subtitle: "Daily treatment support",
    overview: "HIV treatment uses antiretroviral therapy, often called ART, to keep the virus controlled. Regular appointments and lab monitoring help confirm the treatment is working.",
    symptoms: ["Fever, night sweats, or swollen glands", "Unexplained weight loss", "Persistent diarrhea", "Mouth sores or unusual infections", "Medication side effects that make doses hard to take"],
    medication: ["Taking ART exactly as prescribed helps keep HIV controlled.", "Missed doses can allow HIV to multiply and may increase risk of drug resistance.", "If privacy, side effects, cost, or schedule issues get in the way, ask your HIV care team for support."],
    tracking: ["Track dose times and missed doses without judgment.", "Keep viral load, CD4, refill, and clinic dates visible.", "Write down questions or side effects before appointments."],
    urgent: ["Severe allergic reaction or rash", "Trouble breathing", "Severe weakness, confusion, or dehydration", "Signs of a serious infection"],
  },
  asthma: {
    title: "Asthma / respiratory",
    subtitle: "Breathing plan basics",
    overview: "Asthma can narrow and inflame the airways, making breathing harder. A written action plan can help you know daily medicines, rescue steps, triggers, and when to get urgent care.",
    symptoms: ["Wheezing or coughing", "Chest tightness", "Shortness of breath", "Night waking from breathing symptoms", "Needing rescue medicine more often than usual"],
    medication: ["Controller medicines work best when taken consistently, even on better days.", "Rescue inhalers are for quick relief; needing them often can mean your plan needs review.", "Do not stop inhaled steroids or other controllers without asking your clinician."],
    tracking: ["Log triggers, peak flow, rescue inhaler use, and night symptoms.", "Keep inhaler technique and spacer use reviewed.", "Update your action plan after medication changes."],
    urgent: ["Blue lips or face", "Severe trouble breathing or speaking", "Rescue medicine not helping", "Peak flow in your red zone if your clinician gave zones"],
  },
  kidney: {
    title: "Kidney function",
    subtitle: "Lab and follow-up support",
    overview: "The kidneys filter waste and extra fluid from the blood. Kidney problems can progress quietly, so blood pressure, urine tests, eGFR, creatinine, and follow-up appointments matter.",
    symptoms: ["Swelling in feet, ankles, hands, or face", "Foamy urine or changes in urination", "Tiredness, nausea, or poor appetite", "Itching or muscle cramps", "Shortness of breath or chest discomfort"],
    medication: ["Blood pressure, diabetes, and kidney-related medicines may protect kidney function when taken as prescribed.", "Avoid stopping medicines or adding over-the-counter pain medicines without checking with your clinician.", "Report side effects early so your care team can adjust safely."],
    tracking: ["Log eGFR, creatinine, urine ACR/protein, and blood pressure.", "Keep lab and nephrology dates visible.", "Record fluid, salt, potassium, or protein guidance from your clinician."],
    urgent: ["Very low urine output", "Severe swelling or trouble breathing", "Chest pain, confusion, or fainting", "Very high blood pressure with symptoms"],
  },
  cholesterol: {
    title: "Cholesterol",
    subtitle: "Heart risk support",
    overview: "Cholesterol is a blood fat the body needs, but high LDL cholesterol can raise the risk of heart disease and stroke. Treatment often combines lifestyle changes, lab checks, and sometimes medicine.",
    symptoms: ["High cholesterol usually has no symptoms", "Chest pain or pressure", "Shortness of breath", "Leg pain with walking", "Stroke-like symptoms such as face droop, arm weakness, or speech trouble"],
    medication: ["If prescribed, cholesterol medicine works best when taken regularly.", "Do not stop statins or other cholesterol medicines without talking to your clinician.", "Lifestyle changes and medicine can work together to lower risk."],
    tracking: ["Track LDL, HDL, triglycerides, blood pressure, and family history.", "Keep lipid panel follow-up dates.", "Record side effects, nutrition goals, activity, and smoking status if relevant."],
    urgent: ["Chest pain, fainting, or severe shortness of breath", "Stroke-like symptoms", "New weakness or severe unexplained muscle pain after starting medicine", "Severe allergic reaction"],
  },
  thyroid: {
    title: "Thyroid tracking",
    subtitle: "Hormone and symptom support",
    overview: "The thyroid helps control energy use, temperature, weight, and heart rhythm. Thyroid levels are usually monitored with blood tests such as TSH and T4.",
    symptoms: ["Fatigue, weight change, or mood changes", "Cold or heat sensitivity", "Palpitations or slow heart rate", "Hair, skin, or menstrual changes", "Neck swelling or trouble swallowing"],
    medication: ["Take thyroid medicine exactly as directed because timing and consistency affect levels.", "Some thyroid medicines need separation from food, iron, calcium, or other medicines.", "Do not stop or change the dose without lab-guided advice from your clinician."],
    tracking: ["Log TSH, T4/T3 results, symptoms, medication timing, and dose changes.", "Keep lab checks after dose changes.", "Write down pregnancy plans or new medicines because they may affect dosing."],
    urgent: ["Chest pain, fainting, or severe palpitations", "Severe confusion or extreme weakness", "High fever with severe thyroid symptoms", "Trouble breathing or swallowing"],
  },
  hypertension: {
    title: "Hypertension",
    subtitle: "Blood pressure support",
    overview: "Hypertension means blood pressure is higher than normal over time. It often has no warning signs, but uncontrolled blood pressure can affect the heart, brain, kidneys, and eyes.",
    symptoms: ["Often no symptoms", "Headache, chest pain, or shortness of breath", "Vision changes", "Dizziness or confusion", "Weakness, numbness, or speech trouble"],
    medication: ["Take blood pressure medicine as prescribed, even when you feel well.", "Stopping suddenly can make blood pressure rise and may be dangerous for some medicines.", "Ask your clinician about side effects instead of skipping doses."],
    tracking: ["Log home blood pressure with date, time, and context.", "Bring readings to appointments.", "Track salt intake, activity, stress, sleep, and missed doses."],
    urgent: ["Chest pain, severe shortness of breath, or fainting", "Stroke-like symptoms", "Severe headache with confusion or vision change", "Very high readings with symptoms"],
  },
};

for (const key of ["hepatitis_a", "hepatitis_b", "hepatitis_c", "hepatitis_d", "hepatitis_e"]) {
  EDUCATION[key] = { ...HEPATITIS_CONTENT, title: `Hepatitis ${key.slice(-1).toUpperCase()}` };
}

for (const [key, title] of [
  ["diabetes_type_1", "Type 1 diabetes"],
  ["diabetes_type_2", "Type 2 diabetes"],
  ["gestational_diabetes", "Gestational diabetes"],
]) {
  EDUCATION[key] = { ...DIABETES_CONTENT, title };
}

export default function ConditionEducationScreen({ navigation, route }: any) {
  const condition = route?.params?.condition || "asthma";
  const content = EDUCATION[condition] || EDUCATION.asthma;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.navigate("Conditions")} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <BookOpen size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Education</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Stethoscope size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>YOUR CONDITION GUIDE</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
      </View>

      <InfoCard icon={BookOpen} title="What it is" items={[content.overview]} />
      <InfoCard icon={Activity} title="Symptoms to observe" items={content.symptoms} />
      <InfoCard icon={Pill} title="Why medication consistency matters" items={content.medication} />
      <InfoCard icon={CalendarClock} title="What to keep tracking" items={content.tracking} />
      <InfoCard icon={AlertTriangle} title="Get urgent help for" items={content.urgent} urgent />

      <View style={styles.footer}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.footerText}>This guide is educational and does not diagnose or replace your clinician's plan. Use your prescribed care plan and local emergency services for urgent symptoms.</Text>
      </View>
    </ScrollView>
  );
}

function InfoCard({ icon: Icon, title, items, urgent }: { icon: any; title: string; items: string[]; urgent?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, urgent && styles.urgentIcon]}>
          <Icon size={17} color={urgent ? colors.urgent : colors.primary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.itemRow}>
          <CheckCircle2 size={14} color={urgent ? colors.urgent : colors.mint} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  urgentIcon: { backgroundColor: colors.urgentDim },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14.5, flex: 1 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  itemText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14 },
  footerText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
