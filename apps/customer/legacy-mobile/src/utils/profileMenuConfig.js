import { COLORS } from '../theme/colors';
export const PROFILE_MENU_ITEMS = [
  {
    id: "address",
    title: "Saved Addresses",
    subtitle: "Home, Office, Other locations",
    icon: "map-pin",
    color: COLORS.cyan500,
    routeName: "Address",
  },
  {
    id: "rating",
    title: "Rate & Review",
    subtitle: "Rate partners, build trust",
    icon: "star",
    color: COLORS.warning,
    routeName: "Review",
  },
  {
    id: "refer",
    title: "Refer",
    subtitle: "Refer friends, earn rewards",
    icon: "gift",
    color: COLORS.warning,
    routeName: "Referral",
  },
  {
    id: "about",
    title: "About",
    subtitle: "App information",
    icon: "info",
    color: COLORS.blue500,
    routeName: "About",
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    icon: "file-text",
    color: COLORS.slate400,
    routeName: "Terms",
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: "shield",
    color: COLORS.blue500,
    routeName: "Privacy",
  },
  {
    id: "support",
    title: "Help & Support",
    icon: "help-circle",
    color: COLORS.success,
    routeName: "Support",
  },
  {
    id: "logout",
    title: "Logout",
    icon: "log-out",
    color: COLORS.error,
    isLogout: true,
  },
];

export function getProfileMenuItem(itemId) {
  return PROFILE_MENU_ITEMS.find(item => item.id === itemId) || null;
}





