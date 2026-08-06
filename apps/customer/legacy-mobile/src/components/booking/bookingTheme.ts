import { COLORS } from '../../theme/colors';
export const bookingTheme = {
  colors: {
    pageBg: COLORS.navyDark,
    title: COLORS.white,
    subtitle: COLORS.neutral100,
    cardBg: COLORS.navyDark,
    cardBorder: COLORS.goldSoft,
    textPrimary: COLORS.white,
    textMuted: COLORS.neutral100,
    primaryBtn: COLORS.gold,
    primaryBtnText: COLORS.navyDark,
    secondaryBtnBorder: COLORS.goldSoft,
    secondaryBtnText: COLORS.goldSoft,
    success: COLORS.goldSoft,
    warning: COLORS.gold,
    danger: COLORS.error,
  },
  radius: {
    card: 16,
    button: 14,
    pill: 999,
  },
} as const;



