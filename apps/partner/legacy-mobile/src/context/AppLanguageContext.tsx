import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAppTranslations, getCurrentAppLanguage, getSelectedAppLanguage, type AppLanguage } from "../services/appSettingsService";

type AppLanguageContextValue = {
  language: AppLanguage | null;
  refreshLanguage: () => Promise<void>;
  t: (key: string) => string;
};

const AppLanguageContext = createContext<AppLanguageContextValue>({
  language: null,
  refreshLanguage: async () => undefined,
  t: (key) => key,
});

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const refreshLanguage = useCallback(async () => {
    const currentLanguage = await getCurrentAppLanguage();
    const selectedLocale = await getSelectedAppLanguage();
    const locale = selectedLocale ?? currentLanguage?.code;
    setLanguage(currentLanguage);
    setTranslations(locale ? await getAppTranslations(locale) : {});
  }, []);

  useEffect(() => {
    void refreshLanguage().catch(() => undefined);
  }, [refreshLanguage]);

  const value = useMemo(() => ({
    language,
    refreshLanguage,
    t: (key: string) => translations[key] || key,
  }), [language, translations, refreshLanguage]);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export const useAppLanguage = () => useContext(AppLanguageContext);
