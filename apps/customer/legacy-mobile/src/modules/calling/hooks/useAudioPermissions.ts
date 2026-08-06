import { useCallback, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

export function useAudioPermissions() {
  const [denied, setDenied] = useState(false);
  const request = useCallback(async () => {
    if (Platform.OS !== "android") return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    setDenied(!granted);
    return granted;
  }, []);
  return { request, denied };
}
