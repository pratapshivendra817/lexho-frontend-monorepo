import { useCallback, useEffect, useMemo } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { clearSession } from "../../utils/storage";
import { clearSessionState } from "../../redux/authSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
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

const APP_VERSION = "v0.0.1";

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
      <ProfileCard>
        <View style={styles.heroRow}>
          <View style={styles.avatarWrap}>
            {profile?.profileImageUrl ? (
              <MaterialCommunityIcon name="account-circle" size={72} color="#16A34A" />
            ) : (
              <MaterialCommunityIcon name="account-outline" size={72} color="#16A34A" />
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
            <MaterialCommunityIcon name="chevron-right" size={28} color="#9CA3AF" />
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
        <SectionListItem title={`Saved addresses (${addresses.length})`} icon="map-marker-outline" onPress={() => navigation.navigate("Address")} />
        <SectionListItem
          title="About us"
          icon="information-outline"
          onPress={() => Alert.alert("About us", content?.aboutUs || "About us content not available")}
        />
        <SectionListItem
          title="Terms of service"
          icon="file-document-outline"
          onPress={() => Alert.alert("Terms of service", content?.termsOfService || "Terms content not available")}
        />
        <SectionListItem
          title="Privacy policy"
          icon="shield-account-outline"
          onPress={() => Alert.alert("Privacy policy", content?.privacyPolicy || "Privacy content not available")}
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
  root: { flex: 1, backgroundColor: "#F3F8F4" },
  content: { padding: 14, gap: 12 },
  heroRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E8F7EC",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: { flex: 1, gap: 6 },
  editChevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#0B1F14", fontSize: 20, fontWeight: "900" },
  mobile: { color: "#4B6355", fontSize: 14, fontWeight: "600" },
  versionWrap: { alignItems: "center", gap: 4 },
  versionText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  requestSent: { color: "#15803D", fontSize: 12, fontWeight: "700" },
});
