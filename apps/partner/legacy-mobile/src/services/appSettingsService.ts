import API from "./api";
import { getPartnerLanguage, savePartnerLanguage } from "../utils/storage";
import { getFallbackTranslations } from "./appTranslationFallbacks";

export type AppLanguage = {
  code: string;
  label: string;
  nativeLabel?: string;
  enabled: boolean;
  isDefault: boolean;
};

type BackendLanguage = Partial<AppLanguage> & { name?: string; nativeName?: string; locale?: string };

const normalizeLanguage = (value: BackendLanguage): AppLanguage | null => {
  const code = String(value.code ?? value.locale ?? "").trim();
  if (!code) return null;
  return {
    code,
    label: String(value.label ?? value.name ?? code).trim(),
    nativeLabel: String(value.nativeLabel ?? value.nativeName ?? "").trim() || undefined,
    enabled: value.enabled !== false,
    isDefault: value.isDefault === true,
  };
};

export const getAvailableAppLanguages = async (): Promise<AppLanguage[]> => {
  const { data } = await API.get("/api/v1/partner/app-settings/languages");
  const root = data?.data ?? data ?? {};
  const rows = Array.isArray(root) ? root : root.languages;
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeLanguage)
    .filter((language): language is AppLanguage => Boolean(language?.enabled));
};

export const getSelectedAppLanguage = getPartnerLanguage;

export const saveSelectedAppLanguage = async (languageCode: string): Promise<void> => {
  await API.patch("/api/v1/partner/preferences", { language: languageCode });
  await savePartnerLanguage(languageCode);
};

export const getCurrentAppLanguage = async (): Promise<AppLanguage | null> => {
  const [languages, selected] = await Promise.all([getAvailableAppLanguages(), getSelectedAppLanguage()]);
  return languages.find((language) => language.code === selected)
    ?? languages.find((language) => language.isDefault)
    ?? languages[0]
    ?? null;
};

export const getAppTranslations = async (locale: string): Promise<Record<string, string>> => {
  const { data } = await API.get("/api/v1/partner/translations", { params: { locale } });
  const root = data?.data ?? data ?? {};
  const backendTranslations = root.translations && typeof root.translations === "object"
    ? root.translations as Record<string, string>
    : {};
  return {
    ...getFallbackTranslations(locale),
    ...backendTranslations,
  };
};
