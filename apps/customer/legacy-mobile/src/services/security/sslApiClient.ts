import axios from "axios";
import { API_BASE_URL, SSL_PINNING_CERT_NAME, SSL_PINNING_ENABLED } from "../../constants/env";
import { logCrashlyticsMessage, recordNonFatalError } from "../firebaseCrashlytics";

type PinnedRequestConfig = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutInterval?: number;
  certs?: string[];
};

function getSslPinningModule(): any | null {
  try {
    // Optional dependency. Runtime can fall back until native package is installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-ssl-pinning");
  } catch {
    return null;
  }
}

export async function secureRequest<T = unknown>(config: PinnedRequestConfig): Promise<T> {
  const normalizedBaseUrl = String(API_BASE_URL ?? "").replace(/\/+$/, "");
  const url = `${normalizedBaseUrl}${config.path.startsWith("/") ? config.path : `/${config.path}`}`;
  const sslPinning = getSslPinningModule();

  if (SSL_PINNING_ENABLED && sslPinning?.fetch) {
    try {
      const response = await sslPinning.fetch(String(config.method ?? "GET"), url, config.headers ?? {}, {
        ...config.body,
      }, {
        timeoutInterval: config.timeoutInterval ?? 15000,
        sslPinning: {
          certs: config.certs ?? [SSL_PINNING_CERT_NAME],
        },
      });
      const json = typeof response?.json === "function" ? await response.json() : response;
      return json as T;
    } catch (error) {
      await recordNonFatalError(error, {
        area: "ssl_pinning",
        endpoint: config.path,
      });
      throw error;
    }
  }

  await logCrashlyticsMessage("ssl_pinning_fallback_http_client", {
    endpoint: config.path,
    enabled: SSL_PINNING_ENABLED,
  });

  const response = await axios.request<T>({
    baseURL: normalizedBaseUrl,
    url: config.path,
    method: config.method,
    headers: config.headers,
    data: config.body,
    timeout: config.timeoutInterval ?? 15000,
  });

  return response.data;
}
