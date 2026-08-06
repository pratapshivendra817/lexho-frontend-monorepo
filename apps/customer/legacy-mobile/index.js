/**
 * @format
 */

import "react-native-gesture-handler";

import { AppRegistry } from "react-native";
import { recordNonFatalError } from "./src/services/firebaseCrashlytics";
import { trackAnalyticsEvent } from "./src/services/firebaseAnalytics";

import App from "./src/App";
import { name as appName } from "./app.json";

try {
  const rnfbMessaging = require("@react-native-firebase/messaging");
  const messagingInstance = rnfbMessaging.getMessaging();
  rnfbMessaging.setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    await trackAnalyticsEvent("push_background_received", {
      redirect_type: String(remoteMessage?.data?.redirectType ?? remoteMessage?.data?.type ?? ""),
    });
  });
} catch (error) {
  void recordNonFatalError(error, {
    area: "push",
    action: "background_handler_setup",
  });
}

AppRegistry.registerComponent(appName, () => App);
