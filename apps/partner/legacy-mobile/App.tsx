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

const queryClient = new QueryClient();

function AppChrome() {
  const { loading, toastMessage, toastVisible, dismissToast } = useAppFeedback();
  const isOnline = useNetworkStatus();

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
                <NavigationContainer>
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
