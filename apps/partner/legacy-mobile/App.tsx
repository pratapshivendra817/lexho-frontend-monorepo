import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppNavigator from "./src/navigation/AppNavigator";
import { persistor, store } from "./src/redux/store";
import { partnerTheme } from "./src/theme/theme";
import { AppFeedbackProvider, useAppFeedback } from "./src/context/AppFeedbackContext";
import { GlobalLoader } from "./src/components/common/GlobalLoader";
import { ToastMessage } from "./src/components/common/ToastMessage";
import { OfflineBanner } from "./src/components/common/OfflineBanner";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";
import { initializeCrashlytics } from "./src/services/crashlyticsService";
import { navigationTrackingRef, handleNavigationStateChange } from "./src/services/screenTrackingService";
import { useOnlineHoursSync } from "./src/hooks/useOnlineHoursSync";
import { useSecurityGuard } from "./src/hooks/useSecurityGuard";
import RootDetectionWarningScreen from "./src/screens/system/RootDetectionWarningScreen";
import { getOfflineQueueSize, startOfflineQueueAutoRetry } from "./src/services/offlineQueue";
import { useAppDispatch } from "./src/hooks/useRedux";
import { offlineActions } from "./src/redux/slices/offlineSlice";
import { setServerOfflineHandler } from "./src/services/api";
import "./src/services/partnerActionQueueService";

const queryClient = new QueryClient();

function AppChrome() {
  const dispatch = useAppDispatch();
  const { loading, toastMessage, toastVisible, dismissToast } = useAppFeedback();
  const isOnline = useNetworkStatus();
  const securityStatus = useSecurityGuard();
  useOnlineHoursSync();

  React.useEffect(() => {
    void initializeCrashlytics();
    const stopRetry = startOfflineQueueAutoRetry((size) => {
      dispatch(offlineActions.setQueuedActions(size));
    });
    void getOfflineQueueSize().then((size) => dispatch(offlineActions.setQueuedActions(size)));
    setServerOfflineHandler((message) => dispatch(offlineActions.setLastServerError(message)));
    return () => {
      stopRetry?.();
      setServerOfflineHandler(null);
    };
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(offlineActions.setOfflineStatus(!isOnline));
  }, [dispatch, isOnline]);

  if (securityStatus?.blocked) {
    return <RootDetectionWarningScreen />;
  }

  return (
    <>
      <OfflineBanner visible={!isOnline} />
      <AppNavigator />
      <GlobalLoader visible={loading} />
      <ToastMessage visible={toastVisible} message={toastMessage} onClose={dismissToast} />
    </>
  );
}

function App() {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={partnerTheme}>
            <AppFeedbackProvider>
              <SafeAreaProvider>
                <NavigationContainer
                  ref={navigationTrackingRef}
                  onReady={() => { void handleNavigationStateChange(); }}
                  onStateChange={() => { void handleNavigationStateChange(); }}
                >
                  <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
                  <AppChrome />
                </NavigationContainer>
              </SafeAreaProvider>
            </AppFeedbackProvider>
          </PaperProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
