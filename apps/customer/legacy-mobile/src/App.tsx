import { Provider } from "react-redux";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { AppNavigator } from "./navigation/AppNavigator";
import { store } from "./redux/store";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useColorScheme } from "react-native";

const queryClient = new QueryClient();

function Bootstrap() {
  useAuthBootstrap();
  const mode = useColorScheme();
  const icon = ({ color, name, size }: { color: string; name: string; size: number }) => (
    <MaterialCommunityIcon color={color} name={name} size={size} />
  );

  return (
    <PaperProvider
      settings={{ icon }}
      theme={mode === "dark" ? MD3DarkTheme : MD3LightTheme}
    >
      <AppNavigator darkMode={mode === "dark"} />
    </PaperProvider>
  );
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected runtime error",
    };
  }

  componentDidCatch(error: unknown) {
    // Keep it logged in development to quickly identify root-cause instead of silent white screen.
    // eslint-disable-next-line no-console
    console.error("Root render crash", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorRoot}>
          <Text style={styles.errorTitle}>App crashed while rendering</Text>
          <Text style={styles.errorText}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <RootErrorBoundary>
            <Bootstrap />
          </RootErrorBoundary>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFF1F2",
  },
  errorTitle: { color: "#9F1239", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errorText: { color: "#881337", textAlign: "center" },
});
