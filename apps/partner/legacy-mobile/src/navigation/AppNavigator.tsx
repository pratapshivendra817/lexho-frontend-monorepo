import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import DashboardScreen from "../screens/DashboardScreen";
import PartnerProfileScreen from "../screens/PartnerProfileScreen";
import { COLORS } from "../constants/colors";
import { clearSession, getToken, saveAdminProfile, saveToken } from "../utils/storage";
import { setUnauthorizedHandler } from "../services/api";

export type RootStackParamList = {
  Login: undefined;
  Otp: { email: string; password: string };
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = useCallback(async (jwt: string, email: string) => {
    await saveToken(jwt);
    await saveAdminProfile({ email });
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await clearSession();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const token = await getToken();
        if (active) {
          setIsAuthenticated(Boolean(token));
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.background },
    }),
    []
  );

  const MainTabs = useCallback(
    () => (
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: "#7DD3FC",
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="Requests"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons name={focused ? "inbox-full" : "inbox-full-outline"} color={color} size={size} />
            ),
          }}
        >
          {(props) => <DashboardScreen {...props} onLogout={handleLogout} />}
        </Tabs.Screen>
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons name={focused ? "account-circle" : "account-circle-outline"} color={color} size={size} />
            ),
          }}
        >
          {(props) => <PartnerProfileScreen {...props} onLogout={handleLogout} />}
        </Tabs.Screen>
      </Tabs.Navigator>
    ),
    [handleLogout]
  );

  if (bootstrapping) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Otp">
            {props => <OtpScreen {...props} onAuthSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        </>
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
