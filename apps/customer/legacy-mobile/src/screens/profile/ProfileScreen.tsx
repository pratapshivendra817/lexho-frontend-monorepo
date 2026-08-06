import { useCallback, useEffect, useMemo } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { clearSession } from "../../utils/storage";
import { clearSessionState } from "../../redux/authSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";

import { COLORS } from '../../theme/colors';
import {
  fetchCustomerProfileThunk,
  refreshProfileBundleThunk,
  requestAccountDeleteThunk,
} from "../../redux/customerProfileSlice";
import { CustomButton } from "../../modules/profile/components/CustomButton";
import { EmptyState } from "../../modules/profile/components/EmptyState";
import { Loader } from "../../modules/profile/components/Loader";
import { ProfileCard } from "../../modules/profile/components/ProfileCard";
import { SectionListItem } from "../../modules/profile/components/SectionListItem";
import { unregisterDeviceToken } from "../../services/notificationsService";
import { radii, shadows, spacing } from "../../constants/theme";

const APP_VERSION = "v0.0.1";
const DEFAULT_ABOUT_US = `# About Us

Lexho helps customers book trusted home services quickly and conveniently from their phones.

We focus on reliable service partners, smooth bookings, and clear communication so day-to-day home needs feel simple and manageable.

If you need help with your account, bookings, or service experience, please contact our support team.`;

const DEFAULT_TERMS_OF_SERVICE = `# Terms of Service

By using Lexho, you agree to provide accurate information and use the platform only for lawful home-service bookings.

Service availability, pricing, and booking schedules may vary by location. Payments, cancellations, and refunds are handled according to the applicable booking terms.

Please contact support if you need help with a booking or payment.`;

const DEFAULT_PRIVACY_POLICY = `# Privacy Policy

Lexho uses your account details, phone number, and location information to provide home services, manage bookings, and support your requests.

We use reasonable safeguards to protect your information. Your data is shared only where required to deliver services, process payments, or comply with applicable law.

You can contact support for privacy-related questions or account assistance.`;

export function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { profile, addresses, content, status, accountDeleteStatus } = useAppSelector((s) => s.customerProfile);
  const authUser = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    void dispatch(refreshProfileBundleThunk());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    void dispatch(refreshProfileBundleThunk());
  }, [dispatch]);

  const onLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (typeof unregisterDeviceToken === "function") {
                await unregisterDeviceToken();
              }
            } catch {
              // best-effort
            }

            try {
              if (typeof clearSession === "function") {
                await clearSession();
              }
            } catch {
              // best-effort
            }

            dispatch(clearSessionState());
          })();
        },
      },
    ]);
  }, [dispatch]);

  const onDeleteAccount = useCallback(() => {
    Alert.alert("Delete account", "Send account deletion request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Request Delete",
        style: "destructive",
        onPress: () => {
          void dispatch(requestAccountDeleteThunk());
        },
      },
    ]);
  }, [dispatch]);

  const displayName = useMemo(() => {
    const first = profile?.firstName?.trim();
    const last = profile?.lastName?.trim();
    const merged = `${first ?? ""} ${last ?? ""}`.trim();
    return merged || authUser?.name || "Lexho User";
  }, [authUser?.name, profile?.firstName, profile?.lastName]);

  const mobile = profile?.mobile || authUser?.mobile || "Mobile unavailable";

  if (status === "loading" && !profile) {
    return <Loader />;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={status === "loading"} onRefresh={onRefresh} />}
    >
      <View style={styles.topHeader}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcon name="chevron-left" size={22} color={COLORS.white} />
        </Pressable>
        <View style={styles.brandWrap}>
          <Text style={styles.brandText}>
            <Text style={styles.brandTextLex}>Lex</Text>
            <Text style={styles.brandTextHo}>ho</Text>
          </Text>
          <Text style={styles.brandTagline}>Ghar ki seva, ab ek click par</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ProfileCard>
        <View style={styles.heroRow}>
          <View style={styles.avatarWrap}>
            {profile?.profileImageUrl ? (
              <MaterialCommunityIcon name="account-circle" size={72} color={COLORS.navy} />
            ) : (
              <MaterialCommunityIcon name="account-outline" size={72} color={COLORS.navy} />
            )}
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.mobile}>{mobile}</Text>
          </View>
          <Pressable
            style={styles.editChevronBtn}
            onPress={() => navigation.navigate("EditProfile")}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <MaterialCommunityIcon name="chevron-right" size={28} color={COLORS.gold} />
          </Pressable>
        </View>
      </ProfileCard>

      {!profile && status === "error" ? (
        <EmptyState
          title="Could not load profile"
          subtitle="Please check internet and retry."
          actionLabel="Retry"
          onAction={() => void dispatch(fetchCustomerProfileThunk())}
        />
      ) : null}

      <ProfileCard>
        <SectionListItem title="My bookings" icon="clipboard-list-outline" onPress={() => navigation.navigate("Bookings")} />
        <SectionListItem title="Help & Support" icon="help-circle-outline" onPress={() => navigation.navigate("Support")} />
        <SectionListItem title={`Saved address (${addresses.length})`} icon="map-marker-outline" onPress={() => navigation.navigate("Address")} />
        <SectionListItem
          title="About us"
          icon="information-outline"
          onPress={() => navigation.navigate("AboutUs", { content: content?.aboutUs || DEFAULT_ABOUT_US })}
        />
        <SectionListItem
          title="Terms of service"
          icon="file-document-outline"
          onPress={() => navigation.navigate("TermsOfService", { content: content?.termsOfService || DEFAULT_TERMS_OF_SERVICE })}
        />
        <SectionListItem
          title="Privacy policy"
          icon="shield-account-outline"
          onPress={() => navigation.navigate("PrivacyPolicy", { content: content?.privacyPolicy || DEFAULT_PRIVACY_POLICY })}
        />
        <SectionListItem title="Delete account" icon="delete-outline" danger onPress={onDeleteAccount} />
      </ProfileCard>

      <CustomButton label="Logout" onPress={onLogout} variant="ghost" />

      <View style={styles.versionWrap}>
        <Text style={styles.versionText}>App version {APP_VERSION}</Text>
        {accountDeleteStatus === "success" ? <Text style={styles.requestSent}>Delete request submitted.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark },
  content: { padding: spacing.md + 2, gap: spacing.md },
  topHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  brandWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 26, fontWeight: "900", lineHeight: 27, letterSpacing: 0.2 },
  brandTextLex: { color: COLORS.white },
  brandTextHo: { color: COLORS.gold },
  brandTagline: { color: COLORS.neutral100, fontSize: 9, fontWeight: "600", marginTop: 1 },
  headerSpacer: { width: 34, height: 34, marginLeft: "auto" },
  heroRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: radii.xl + 18,
    backgroundColor: COLORS.offWhite,
    borderWidth: 2,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: { flex: 1, gap: 6 },
  editChevronBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217, 164, 65, 0.2)",
    ...shadows.sm,
  },
  name: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  mobile: { color: COLORS.neutral100, fontSize: 14, fontWeight: "600" },
  versionWrap: { alignItems: "center", gap: 4 },
  versionText: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "600" },
  requestSent: { color: COLORS.gold, fontSize: 12, fontWeight: "700" },
});








