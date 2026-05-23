export const PROFILE_MENU_ITEMS = [
  {
    id: "address",
    title: "Saved Addresses",
    subtitle: "Home, Office, Other locations",
    icon: "map-pin",
    color: "#06B6D4",
    routeName: "Address",
  },
  {
    id: "rating",
    title: "Rate & Review",
    subtitle: "Rate partners, build trust",
    icon: "star",
    color: "#F59E0B",
    routeName: "Review",
  },
  {
    id: "refer",
    title: "Refer",
    subtitle: "Refer friends, earn rewards",
    icon: "gift",
    color: "#F97316",
    routeName: "Referral",
  },
  {
    id: "about",
    title: "About",
    subtitle: "App information",
    icon: "info",
    color: "#3B82F6",
    routeName: "About",
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    icon: "file-text",
    color: "#9CA3AF",
    routeName: "Terms",
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: "shield",
    color: "#8B5CF6",
    routeName: "Privacy",
  },
  {
    id: "support",
    title: "Help & Support",
    icon: "help-circle",
    color: "#22C55E",
    routeName: "Support",
  },
  {
    id: "logout",
    title: "Logout",
    icon: "log-out",
    color: "#EF4444",
    isLogout: true,
  },
];

export function getProfileMenuItem(itemId) {
  return PROFILE_MENU_ITEMS.find(item => item.id === itemId) || null;
}

