import { COLORS } from "./colors";
import { SPACING } from "./spacing";
import { SHADOWS } from "./shadows";
import { TYPOGRAPHY } from "./typography";

export const lightTheme = {
  mode: "light",
  colors: COLORS,
  spacing: SPACING,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
};

export const darkTheme = {
  mode: "dark",
  colors: {
    ...COLORS,
    bgPrimary: "#020617",
    bgSecondary: "#0F172A",
    bgCard: "#1E293B",
    textPrimary: "#FFFFFF",
    textSecondary: "#CBD5E1",
    border: "#334155",
  },
  spacing: SPACING,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
};

export const appThemes = {
  customer: {
    light: lightTheme,
    dark: darkTheme,
  },
  partner: {
    light: lightTheme,
    dark: darkTheme,
  },
};

export function getTheme({ app = "customer", mode = "light" } = {}) {
  const appTheme = appThemes[app] ?? appThemes.customer;
  return appTheme[mode] ?? appTheme.light;
}
