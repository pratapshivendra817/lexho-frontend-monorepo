import type { ReactElement } from "react";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { ErrorFeedbackProvider } from "./components/admin";
import { AdminLoginScreen } from "./features/auth";
import AdminLayout from "./layouts/AdminLayout";
import { adminRoutes } from "./navigation/adminRoutes";
import { renderRouteConfig } from "./navigation/routeUtils";
import { initializeAdminPushNotifications } from "./services/adminPushNotifications";
import { hasAdminSession } from "./utils/authSession";

function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center text-white">
      <h1 className="text-2xl">404 - Page Not Found</h1>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminPushBootstrap() {
  useEffect(() => {
    void initializeAdminPushNotifications({ interactive: false }).catch(() => {
      // Push setup should never block the admin shell.
    });
  }, []);

  return null;
}

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const location = useLocation();

  if (!hasAdminSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <AdminPushBootstrap />
      {children}
    </>
  );
}

function PublicAuthRoute({ children }: { children: ReactElement }) {
  if (hasAdminSession()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorFeedbackProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <div className="min-h-screen p-6 text-[var(--color-text)]">
                  <div className="mx-auto mt-16 max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
                    <h1 className="mb-2 text-2xl font-bold">Admin Login</h1>
                    <p className="mb-6 text-sm text-[var(--color-muted)]">
                      Sign in with email, password and OTP.
                    </p>
                    <AdminLoginScreen />
                  </div>
                </div>
              </PublicAuthRoute>
            }
          />

          <Route
            element={
              <RequireAdminAuth>
                <AdminLayout />
              </RequireAdminAuth>
            }
          >
            {renderRouteConfig(adminRoutes)}
            <Route path="*" element={<NotFound />} />
          </Route>
          </Routes>
        </BrowserRouter>
      </ErrorFeedbackProvider>
    </QueryClientProvider>
  );
}
