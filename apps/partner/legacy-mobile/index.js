/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

try {
  const { getApp } = require('@react-native-firebase/app');
  const {
    getMessaging,
    setBackgroundMessageHandler,
  } = require('@react-native-firebase/messaging');
  const messaging = getMessaging(getApp());
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    const { parseCallPush, savePendingIncomingCall } = require('./src/services/callApi');
    const call = parseCallPush(remoteMessage);
    if (call?.type === 'INCOMING_CALL') {
      await savePendingIncomingCall(call);
    }
  });
} catch {
  // Firebase may be unavailable in local non-push builds.
}

AppRegistry.registerComponent(appName, () => App);
