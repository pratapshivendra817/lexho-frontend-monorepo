type CrashlyticsAttributes = Record<string, string | number | boolean | null | undefined>;
type GlobalErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

function getCrashlyticsModule(): any | null {
  try {
    return require("@react-native-firebase/crashlytics");
  } catch {
    return null;
  }
}

function getCrashlyticsInstance() {
  const rnfbCrashlytics = getCrashlyticsModule();
  if (!rnfbCrashlytics) return null;
  return rnfbCrashlytics.getCrashlytics ? rnfbCrashlytics.getCrashlytics() : rnfbCrashlytics.default?.();
}

function getCrashlyticsFunction(name: string) {
  const rnfbCrashlytics = getCrashlyticsModule();
  const direct = rnfbCrashlytics?.[name];
  if (typeof direct === "function") return direct;
  const fromDefault = rnfbCrashlytics?.default?.[name];
  if (typeof fromDefault === "function") return fromDefault;
  return null;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : JSON.stringify(error ?? "Unknown non-fatal error"));
}

function normalizeAttributes(attributes?: CrashlyticsAttributes) {
  if (!attributes) return undefined;
  return Object.entries(attributes).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = String(value);
    return acc;
  }, {});
}

function getDeviceMetadata() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules, Platform } = require("react-native");
    const packageJson = require("../../package.json");
    const platformConstants = NativeModules?.PlatformConstants ?? {};
    return {
      platform: Platform.OS,
      platformVersion: String(Platform.Version ?? ""),
      appVersion: String(packageJson?.version ?? ""),
      deviceBrand: String(platformConstants.Brand ?? ""),
      deviceModel: String(platformConstants.Model ?? ""),
      systemName: String(platformConstants.systemName ?? Platform.OS),
    };
  } catch {
    return {};
  }
}

export async function initializeCrashlytics(userId?: string | number | null) {
  const metadata = getDeviceMetadata();
  await setCrashlyticsUser(userId);
  await logCrashlyticsMessage("crashlytics_initialized", metadata);

  const globalErrorUtils = (globalThis as any).ErrorUtils as GlobalErrorUtils | undefined;
  const currentHandler = globalErrorUtils?.getGlobalHandler?.();
  if (globalErrorUtils?.setGlobalHandler) {
    globalErrorUtils.setGlobalHandler((error, isFatal) => {
      void recordNonFatalError(error, {
        ...metadata,
        isFatal: Boolean(isFatal),
        source: "global_error_handler",
      });
      currentHandler?.(error, isFatal);
    });
  }

  if (typeof (globalThis as any).onunhandledrejection !== "function") {
    (globalThis as any).onunhandledrejection = (event: any) => {
      void recordNonFatalError(event?.reason ?? event, {
        ...metadata,
        source: "unhandled_promise_rejection",
      });
    };
  }
}

export async function setCrashlyticsUser(userId?: string | number | null) {
  const normalizedUserId = String(userId ?? "").trim();
  try {
    const crashlytics = getCrashlyticsInstance();
    if (!crashlytics) return;
    const setUserId = getCrashlyticsFunction("setUserId");
    if (setUserId) {
      await setUserId(crashlytics, normalizedUserId);
      return;
    }
    await crashlytics.setUserId?.(normalizedUserId);
  } catch {
    // Crash reporting must never block app flows.
  }
}

export async function logCrashlyticsMessage(message: string, attributes?: CrashlyticsAttributes) {
  const normalizedMessage = String(message ?? "").trim();
  if (!normalizedMessage) return;
  try {
    const crashlytics = getCrashlyticsInstance();
    if (!crashlytics) return;
    const normalizedAttributes = normalizeAttributes(attributes);
    const setAttributes = getCrashlyticsFunction("setAttributes");
    if (normalizedAttributes) {
      if (setAttributes) {
        await setAttributes(crashlytics, normalizedAttributes);
      } else {
        await crashlytics.setAttributes?.(normalizedAttributes);
      }
    }
    const log = getCrashlyticsFunction("log");
    if (log) {
      await log(crashlytics, normalizedMessage);
      return;
    }
    await crashlytics.log?.(normalizedMessage);
  } catch {
    // Best-effort breadcrumbs.
  }
}

export async function recordNonFatalError(error: unknown, attributes?: CrashlyticsAttributes) {
  try {
    const crashlytics = getCrashlyticsInstance();
    if (!crashlytics) return;
    const normalizedAttributes = normalizeAttributes(attributes);
    const setAttributes = getCrashlyticsFunction("setAttributes");
    if (normalizedAttributes) {
      if (setAttributes) {
        await setAttributes(crashlytics, normalizedAttributes);
      } else {
        await crashlytics.setAttributes?.(normalizedAttributes);
      }
    }
    const normalizedError = normalizeError(error);
    const recordError = getCrashlyticsFunction("recordError");
    if (recordError) {
      await recordError(crashlytics, normalizedError);
      return;
    }
    await crashlytics.recordError?.(normalizedError);
  } catch {
    // Non-fatal logging should not create a second failure.
  }
}
