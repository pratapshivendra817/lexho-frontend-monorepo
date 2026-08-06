import NetInfo from "@react-native-community/netinfo";

type NetworkListener = (isOnline: boolean) => void;

let currentOnline = true;

export async function isNetworkOnline() {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected) && Boolean(state.isInternetReachable ?? true);
  } catch {
    return true;
  }
}

export function subscribeNetworkStatus(listener: NetworkListener) {
  return NetInfo.addEventListener((state) => {
    currentOnline = Boolean(state.isConnected) && Boolean(state.isInternetReachable ?? true);
    listener(currentOnline);
  });
}

export function getCurrentNetworkStatus() {
  return currentOnline;
}

