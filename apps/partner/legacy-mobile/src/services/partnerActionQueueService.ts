import { enqueueOfflineAction, registerOfflineHandler } from "./offlineQueue";
import { acceptDispatchRequest, rejectDispatchRequest, sendDispatchLocation, updatePartnerProfile } from "./partnerService";
import { getCurrentNetworkStatus } from "./networkService";

registerOfflineHandler("accept_order", async (payload) => {
  await acceptDispatchRequest(Number(payload.requestId));
});

registerOfflineHandler("reject_order", async (payload) => {
  await rejectDispatchRequest(Number(payload.requestId), String(payload.reason ?? "Not available"));
});

registerOfflineHandler("update_location", async (payload) => {
  await sendDispatchLocation(payload as any);
});

registerOfflineHandler("update_profile", async (payload) => {
  await updatePartnerProfile(payload as any);
});

export async function enqueueAcceptOrder(requestId: number) {
  return enqueueOfflineAction("accept_order", { requestId });
}

export async function enqueueRejectOrder(requestId: number, reason: string) {
  return enqueueOfflineAction("reject_order", { requestId, reason });
}

export async function enqueueProfileUpdate(payload: Record<string, unknown>) {
  return enqueueOfflineAction("update_profile", payload);
}

export async function enqueueLocationUpdate(payload: Record<string, unknown>) {
  return enqueueOfflineAction("update_location", payload);
}

export function canAttemptOnlineAction() {
  return getCurrentNetworkStatus();
}
