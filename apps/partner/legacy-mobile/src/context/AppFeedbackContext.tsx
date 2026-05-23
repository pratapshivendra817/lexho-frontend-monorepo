import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AppFeedbackContextValue = {
  loading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
  toast: (message: string) => void;
  toastMessage: string;
  toastVisible: boolean;
  dismissToast: () => void;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showLoader = useCallback(() => setLoading(true), []);
  const hideLoader = useCallback(() => setLoading(false), []);

  const dismissToast = useCallback(() => setToastVisible(false), []);
  const toast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const value = useMemo(
    () => ({ loading, showLoader, hideLoader, toast, toastMessage, toastVisible, dismissToast }),
    [loading, showLoader, hideLoader, toast, toastMessage, toastVisible, dismissToast],
  );

  return <AppFeedbackContext.Provider value={value}>{children}</AppFeedbackContext.Provider>;
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) throw new Error("useAppFeedback must be used inside AppFeedbackProvider");
  return context;
}
