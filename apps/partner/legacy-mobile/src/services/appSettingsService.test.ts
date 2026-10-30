jest.mock("./api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("../utils/storage", () => ({
  getPartnerLanguage: jest.fn(async () => null),
  savePartnerLanguage: jest.fn(async () => undefined),
}));

import API from "./api";
import { getAppTranslations } from "./appSettingsService";
import { SUPPORTED_APP_FALLBACK_LOCALES, getFallbackTranslations } from "./appTranslationFallbacks";

describe("appSettingsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("merges Hindi fallback translations when backend payload is incomplete", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          translations: {
            "settings.title": "ऐप विकल्प",
          },
        },
      },
    });

    await expect(getAppTranslations("hi-IN")).resolves.toEqual(expect.objectContaining({
      "settings.title": "ऐप विकल्प",
      "settings.language": "भाषा",
      "documents.upload_cta": "दस्तावेज अपलोड करें",
    }));
  });

  it("merges English fallback translations for non-Hindi locales and lets backend win", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          translations: {
            "settings.title": "App Settings",
          },
        },
      },
    });

    await expect(getAppTranslations("en-IN")).resolves.toEqual(expect.objectContaining({
      "settings.title": "App Settings",
      "settings.language": "Language",
      "home.title": "Partner Home",
    }));
  });

  it("supports the configured 9 locale fallbacks and resolves locale families", () => {
    expect(SUPPORTED_APP_FALLBACK_LOCALES).toEqual([
      "en-IN",
      "hi-IN",
      "mr-IN",
      "bn-IN",
      "ta-IN",
      "te-IN",
      "kn-IN",
      "ml-IN",
      "gu-IN",
    ]);

    expect(getFallbackTranslations("hi-IN")).toEqual(expect.objectContaining({
      "settings.language": expect.any(String),
    }));
    expect(getFallbackTranslations("mr-IN")).toEqual(expect.objectContaining({
      "settings.language": expect.any(String),
      "home.title": expect.any(String),
    }));
    expect(getFallbackTranslations("bn-IN")).toEqual(expect.objectContaining({
      "settings.language": expect.any(String),
    }));
    expect(getFallbackTranslations("gu-IN")).toEqual(expect.objectContaining({
      "chat.title": expect.any(String),
    }));
    expect(getFallbackTranslations("unknown-IN")).toEqual({});
  });
});
