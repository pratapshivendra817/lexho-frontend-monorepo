import { useCallback, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { WEBSITE_BASE_URL } from "../../constants/env";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { COLORS } from "../../theme/colors";

type WebViewRef = {
  goBack: () => void;
  injectJavaScript: (script: string) => void;
};

// react-native-webview's React 19 declaration currently resolves its props to
// `never` in this app. Keep the runtime component and its small ref contract
// typed locally until the package publishes compatible declarations.
const WebViewComponent: any = WebView;

export function LegalWebsiteScreen({ route }: { route: { params: { path: string } } }) {
  const webView = useRef<WebViewRef | null>(null);
  const canGoBack = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (failed || !canGoBack.current) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [failed]));

  return (
    <View style={styles.root}>
      {failed ? (
        <EmptyStateCard title="Could not load page" subtitle="Check your connection and tap to retry." onPress={() => {
          canGoBack.current = false;
          setFailed(false);
          setAttempt(value => value + 1);
        }} />
      ) : (
        <WebViewComponent
          key={attempt}
          ref={webView}
          source={{ uri: WEBSITE_BASE_URL + route.params.path }}
          style={styles.root}
          startInLoadingState
          renderLoading={() => <View style={styles.loading}><SkeletonList rows={5} /></View>}
          onNavigationStateChange={(state: { canGoBack?: boolean }) => { canGoBack.current = Boolean(state.canGoBack); }}
          onError={() => setFailed(true)}
          onHttpError={(event: { nativeEvent?: { url?: string } }) => {
            if (event.nativeEvent?.url === WEBSITE_BASE_URL + route.params.path) setFailed(true);
          }}
          onOpenWindow={(event: { nativeEvent?: { targetUrl?: string } }) => {
            const url = event.nativeEvent?.targetUrl ?? "";
            if (/^https?:\/\//i.test(url)) {
              webView.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark },
  loading: { ...StyleSheet.absoluteFill, padding: 18, backgroundColor: COLORS.navyDark },
});
