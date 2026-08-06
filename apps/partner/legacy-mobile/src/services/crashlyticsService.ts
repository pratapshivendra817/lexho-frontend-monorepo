import { Platform } from "react-native";

import { getPartnerProviderId } from "../utils/storage";

type CrashContext = {
  partnerId?: string | null;
  appVersion?: string | null;
  deviceInfo?: string | null;
  [key: string]: unknown;
};

function getCrashlyticsModule() {
  try {
    return require("@react-native-firebase/crashlytics");
  } catch {
    return null;
  }
}

function getCrashlyticsClient() {
  const module = getCrashlyticsModule();
  if (!module) return null;
  const instance = module.getCrashlytics ? module.getCrashlytics() : module.default?.();
  if (!instance) return null;
  return { module, instance };
}

async function setCrashUserId(client: { module: any; instance: any }, userId: string) {
  if (typeof client.module.setUserId === "function") {
    await client.module.setUserId(client.instance, userId);
    return;
  }
  if (typeof client.instance.setUserId === "function") {
    await client.instance.setUserId(userId);
  }
}

async function setCrashAttribute(client: { module: any; instance: any }, key: string, value: string) {
  if (typeof client.module.setAttribute === "function") {
    await client.module.setAttribute(client.instance, key, value);
    return;
  }
  if (typeof client.instance.setAttribute === "function") {
    await client.instance.setAttribute(key, value);
  }
}

function logCrashMessage(client: { module: any; instance: any }, message: string) {
  if (typeof client.module.log === "function") {
    client.module.log(client.instance, message);
    return;
  }
  if (typeof client.instance.log === "function") {
    client.instance.log(message);
  }
}

function recordCrashError(client: { module: any; instance: any }, error: Error) {
  if (typeof client.module.recordError === "function") {
    client.module.recordError(client.instance, error);
    return;
  }
  if (typeof client.instance.recordError === "function") {
    client.instance.recordError(error);
  }
}

async function getDeviceSummary() {
  try {
    const deviceInfo = require("react-native-device-info");
    const model = typeof deviceInfo.getModel === "function" ? deviceInfo.getModel() : "unknown";
    const systemVersion =
      typeof deviceInfo.getSystemVersion === "function" ? deviceInfo.getSystemVersion() : "unknown";
    return `${Platform.OS}:${model}:${systemVersion}`;
  } catch {
    return `${Platform.OS}:unknown`;
  }
}

async function getAppVersion() {
  try {
    const deviceInfo = require("react-native-device-info");
    const version = typeof deviceInfo.getVersion === "function" ? deviceInfo.getVersion() : null;
    const build = typeof deviceInfo.getBuildNumber === "function" ? deviceInfo.getBuildNumber() : null;
    return [version, build].filter(Boolean).join("+") || null;
  } catch {
    return null;
  }
}

export async function applyCrashContext(extra?: CrashContext) {
  const crashlytics = getCrashlyticsClient();
  if (!crashlytics) return;
  const partnerId = extra?.partnerId ?? (await getPartnerProviderId());
  const appVersion = extra?.appVersion ?? (await getAppVersion());
  const deviceInfo = extra?.deviceInfo ?? (await getDeviceSummary());

  if (partnerId) {
    await setCrashUserId(crashlytics, String(partnerId));
  }
  if (partnerId) await setCrashAttribute(crashlytics, "partner_id", String(partnerId));
  if (appVersion) await setCrashAttribute(crashlytics, "app_version", String(appVersion));
  if (deviceInfo) await setCrashAttribute(crashlytics, "device_info", String(deviceInfo));
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null) {
      await setCrashAttribute(crashlytics, String(key), String(value));
    }
  }
}

export async function logCrashBreadcrumb(message: string, context?: Record<string, unknown>) {
  const crashlytics = getCrashlyticsClient();
  if (!crashlytics) return;
  const details = context ? ` ${JSON.stringify(context)}` : "";
  logCrashMessage(crashlytics, `${message}${details}`);
}

export async function recordCrash(error: unknown, context?: CrashContext) {
  const crashlytics = getCrashlyticsClient();
  if (!crashlytics) return;
  await applyCrashContext(context);
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown application error");
  recordCrashError(crashlytics, normalized);
}

export async function logApiFailure(error: unknown, request: { method?: string; url?: string; status?: number | null }) {
  await logCrashBreadcrumb("api_failure", request);
  await recordCrash(error, {
    api_method: request.method ?? "UNKNOWN",
    api_url: request.url ?? "UNKNOWN",
    api_status: request.status ?? "UNKNOWN",
  });
}

export async function logLocationFailure(error: unknown, context?: Record<string, unknown>) {
  await logCrashBreadcrumb("location_failure", context);
  await recordCrash(error, context);
}

export async function logNotificationFailure(error: unknown, context?: Record<string, unknown>) {
  await logCrashBreadcrumb("notification_failure", context);
  await recordCrash(error, context);
}

export async function initializeCrashlytics() {
  const crashlytics = getCrashlyticsClient();
  if (!crashlytics) return false;
  await applyCrashContext();
  const globalScope = globalThis as any;

  const globalHandler = globalScope.ErrorUtils?.getGlobalHandler?.();
  if (globalScope.ErrorUtils?.setGlobalHandler) {
    globalScope.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void recordCrash(error, { is_fatal: Boolean(isFatal) });
      globalHandler?.(error, isFatal);
    });
  }

  if (!globalScope.__PARTNER_UNHANDLED_REJECTION__) {
    globalScope.__PARTNER_UNHANDLED_REJECTION__ = true;
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const [first] = args;
      if (typeof first === "string" && first.toLowerCase().includes("unhandled promise rejection")) {
        void recordCrash(new Error(first), { source: "promise_rejection" });
      }
      originalConsoleError(...args);
    };
  }
  return true;
}
