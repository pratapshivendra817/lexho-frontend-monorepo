import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfigWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();

  const keys = [
    "VITE_APP_ENV",
    "VITE_API_BASE_URL",
    "VITE_ADMIN_IMAGE_UPLOAD_ENDPOINT",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_VAPID_KEY",
  ] as const;

  for (const key of keys) {
    vi.unstubAllEnvs();
    break;
  }

  for (const key of keys) {
    vi.stubEnv(key, env[key]);
  }

  return import("@/config");
}

describe("config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses development defaults when env vars are missing", async () => {
    const { appConfig } = await loadConfigWithEnv({});

    expect(appConfig).toEqual({
      env: "development",
      apiBaseUrl: "http://localhost:8082",
      adminImageUploadEndpoint: "/api/admin/upload/image",
      firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        vapidKey: "",
      },
    });
  });

  it("prefers explicit trimmed env values when provided", async () => {
    const { appConfig } = await loadConfigWithEnv({
      VITE_APP_ENV: "staging",
      VITE_API_BASE_URL: "  https://admin-api.lexho.test  ",
      VITE_ADMIN_IMAGE_UPLOAD_ENDPOINT: "  /custom/upload  ",
      VITE_FIREBASE_API_KEY: " key ",
      VITE_FIREBASE_AUTH_DOMAIN: " auth.domain ",
      VITE_FIREBASE_PROJECT_ID: " project ",
      VITE_FIREBASE_STORAGE_BUCKET: " bucket ",
      VITE_FIREBASE_MESSAGING_SENDER_ID: " sender ",
      VITE_FIREBASE_APP_ID: " app-id ",
      VITE_FIREBASE_VAPID_KEY: " vapid ",
    });

    expect(appConfig.env).toBe("staging");
    expect(appConfig.apiBaseUrl).toBe("https://admin-api.lexho.test");
    expect(appConfig.adminImageUploadEndpoint).toBe("/custom/upload");
    expect(appConfig.firebase).toEqual({
      apiKey: "key",
      authDomain: "auth.domain",
      projectId: "project",
      storageBucket: "bucket",
      messagingSenderId: "sender",
      appId: "app-id",
      vapidKey: "vapid",
    });
  });

  it("falls back to the environment base URL map when explicit endpoints are blank", async () => {
    const { appConfig } = await loadConfigWithEnv({
      VITE_APP_ENV: "production",
      VITE_API_BASE_URL: "   ",
      VITE_ADMIN_IMAGE_UPLOAD_ENDPOINT: "   ",
      VITE_FIREBASE_API_KEY: "   ",
    });

    expect(appConfig.env).toBe("production");
    expect(appConfig.apiBaseUrl).toBe("https://api.lexho.com");
    expect(appConfig.adminImageUploadEndpoint).toBe("/api/admin/upload/image");
    expect(appConfig.firebase.apiKey).toBe("");
  });

  it("falls back to development defaults for invalid environment values", async () => {
    const { appConfig } = await loadConfigWithEnv({
      VITE_APP_ENV: "qa",
      VITE_API_BASE_URL: "",
      VITE_ADMIN_IMAGE_UPLOAD_ENDPOINT: "",
    });

    expect(appConfig.env).toBe("development");
    expect(appConfig.apiBaseUrl).toBe("http://localhost:8082");
    expect(appConfig.adminImageUploadEndpoint).toBe("/api/admin/upload/image");
  });
});
