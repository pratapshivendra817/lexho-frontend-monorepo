import { SPACING } from '../theme/spacing';
import { COLORS } from '../theme/colors';
import { SHADOWS } from '../theme/shadows';

export const palette = {
  primary: COLORS.primary,
  primaryDark: COLORS.navy,
  bg: COLORS.bgPrimary,
  card: COLORS.bgCard,
  surfaceAlt: COLORS.offWhite,
  text: COLORS.charcoal,
  muted: COLORS.gray,
  mutedSoft: COLORS.gray,
  icon: COLORS.gray,
  iconSoft: COLORS.gray,
  white: COLORS.white,
  shadow: COLORS.black,
  overlayDark40: COLORS.overlayDark40,
  border: COLORS.border,
  borderSoft: COLORS.gray,
  accentBlue: COLORS.primary,
  accentCook: COLORS.gold,
  accentCleaning: COLORS.primary,
  success: COLORS.green600,
  successAlt: COLORS.teal700,
  successSoft: COLORS.offWhite,
  successTint: COLORS.offWhite,
  successText: COLORS.navy,
  danger: COLORS.danger,
};

export const spacing = {
  xs: SPACING.xs,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
  xl: SPACING.xl,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadows = SHADOWS;
