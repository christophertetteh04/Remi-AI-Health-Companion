import React from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors } from "../theme/tokens";

export const LARGE_TEXT_KEY = "remi_large_text";
export const DARK_APPEARANCE_KEY = "remi_dark_appearance";

const LARGE_TEXT_MULTIPLIER = 1.16;
const LIGHT_COLORS = { ...colors };
const DARK_COLORS: typeof colors = {
  bg: "#090D13",
  surface: "#121821",
  surfaceRaised: "#1A2330",
  hairline: "#2B3543",
  ink: "#F4F7FA",
  inkSoft: "#B9C4D2",
  inkFaint: "#8491A3",
  primary: "#8BB7FF",
  primaryDim: "#172A46",
  peach: "#F5B66F",
  peachDim: "#342414",
  mint: "#74E0B9",
  mintDim: "#12372E",
  urgent: "#FF8989",
  urgentDim: "#3A1A20",
};

let currentMultiplier = 1;
let darkAppearance = false;
let installed = false;
const listeners = new Set<(enabled: boolean) => void>();

export function installLargeTextScaling() {
  if (installed) return;
  installed = true;

  const originalCreateElement = React.createElement;
  (React as any).createElement = function patchedCreateElement(type: any, props: any, ...children: any[]) {
    if (props?.style && (darkAppearance || currentMultiplier > 1)) {
      return originalCreateElement(type, { ...props, style: transformDisplayStyle(type, props.style) }, ...children);
    }
    return originalCreateElement(type, props, ...children);
  };
}

export async function loadLargeTextEnabled() {
  const enabled = (await SecureStore.getItemAsync(LARGE_TEXT_KEY)) === "true";
  currentMultiplier = enabled ? LARGE_TEXT_MULTIPLIER : 1;
  return enabled;
}

export async function loadDarkAppearanceEnabled() {
  const enabled = (await SecureStore.getItemAsync(DARK_APPEARANCE_KEY)) === "true";
  applyDarkAppearance(enabled);
  return enabled;
}

export function isDarkAppearanceEnabled() {
  return darkAppearance;
}

export async function setLargeTextEnabled(enabled: boolean) {
  currentMultiplier = enabled ? LARGE_TEXT_MULTIPLIER : 1;
  if (enabled) await SecureStore.setItemAsync(LARGE_TEXT_KEY, "true");
  else await SecureStore.deleteItemAsync(LARGE_TEXT_KEY);
  listeners.forEach((listener) => listener(enabled));
}

export async function setDarkAppearanceEnabled(enabled: boolean) {
  applyDarkAppearance(enabled);
  if (enabled) await SecureStore.setItemAsync(DARK_APPEARANCE_KEY, "true");
  else await SecureStore.deleteItemAsync(DARK_APPEARANCE_KEY);
  listeners.forEach((listener) => listener(enabled));
}

export function subscribeLargeText(listener: (enabled: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function transformDisplayStyle(type: any, style: any) {
  const flattened = StyleSheet.flatten(style);
  if (!flattened) return style;

  const next = { ...flattened };
  if (darkAppearance) transformColors(next);
  if (currentMultiplier > 1 && (type === Text || type === TextInput)) {
    if (typeof next.fontSize === "number") next.fontSize = roundHalf(next.fontSize * currentMultiplier);
    if (typeof next.lineHeight === "number") next.lineHeight = roundHalf(next.lineHeight * currentMultiplier);
  }
  return next;
}

function transformColors(style: Record<string, any>) {
  const colorKeys = [
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "color",
    "shadowColor",
  ];
  for (const key of colorKeys) {
    if (typeof style[key] === "string") style[key] = darkColorFor(style[key]);
  }
}

function darkColorFor(value: string) {
  const normalized = value.toUpperCase();
  const rgba = normalized.match(/^RGBA?\(([^)]+)\)$/);
  if (rgba) return darkRgbaFor(value, rgba[1]);
  if (/^#[0-9A-F]{8}$/.test(normalized)) {
    const base = normalized.slice(0, 7);
    const alpha = normalized.slice(7);
    const mappedBase = darkColorFor(base);
    return mappedBase === base ? value : `${mappedBase}${alpha}`;
  }
  const entry = (Object.keys(LIGHT_COLORS) as Array<keyof typeof LIGHT_COLORS>).find((key) => LIGHT_COLORS[key].toUpperCase() === normalized);
  if (entry) return DARK_COLORS[entry];
  if (normalized === "#FBFDFF") return DARK_COLORS.surfaceRaised;
  if (normalized === "#0F172A") return "#000000";
  if (normalized === "#F8B4B4") return "#6B3038";
  if (normalized === "#000000") return "#000000";
  return value;
}

function darkRgbaFor(original: string, channelText: string) {
  const channels = channelText.split(",").map((part) => Number(part.trim()));
  const [r, g, b, alpha = 1] = channels;
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return original;

  if (r >= 245 && g >= 245 && b >= 245 && alpha >= 0.8) return `rgba(18,24,33,${clampAlpha(alpha)})`;
  if (r === 16 && g === 32 && b === 51 && alpha <= 0.08) return "rgba(0,0,0,0.22)";
  if (r === 16 && g === 32 && b === 51) return "rgba(0,0,0,0.68)";
  if (r === 155 && g === 140 && b === 250) return "rgba(139,183,255,0.34)";
  return original;
}

function clampAlpha(alpha: number) {
  return Math.min(Math.max(alpha, 0), 1);
}

function applyDarkAppearance(enabled: boolean) {
  darkAppearance = enabled;
  Object.assign(colors, enabled ? DARK_COLORS : LIGHT_COLORS);
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}
