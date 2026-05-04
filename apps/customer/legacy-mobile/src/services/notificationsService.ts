import { ENABLE_FIREBASE_PUSH } from "../utils/constants";

export async function initializePushNotifications() {
  if (!ENABLE_FIREBASE_PUSH) {
    return false;
  }

  try {
    // Firebase messaging setup is intentionally loaded dynamically so the app
    // can compile even before native Firebase modules are added.
    const messaging = require("@react-native-firebase/messaging").default;
    await messaging().requestPermission();
    await messaging().registerDeviceForRemoteMessages();
    return true;
  } catch {
    return false;
  }
}
