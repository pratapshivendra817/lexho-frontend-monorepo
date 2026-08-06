import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { flushSOSQueue } from "../services/SOSApiService";
export function useSOSOfflineQueue(enabled = true) { useEffect(() => { if (!enabled) return; void flushSOSQueue(); return NetInfo.addEventListener(state => { if (state.isConnected && state.isInternetReachable !== false) void flushSOSQueue(); }); }, [enabled]); }
