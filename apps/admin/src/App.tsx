import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import UserProfile from "./pages/admin/UserProfile";
import BookingsPage from "./pages/BookingsPage";
import BookingDetailsPage from "./pages/BookingDetailsPage";
import ServicesPage from "./pages/ServicesPage";
import BannersPage from "./pages/BannersPage";

// Providers
import ProvidersPage from "./pages/ProvidersPage";
import ProviderVerification from "./pages/ProviderVerification";

// Reviews
import ReviewsPage from "./pages/ReviewsPage";

// Payouts
import PayoutsPage from "./pages/PayoutsPage";

import NotificationsPage from "./pages/NotificationsPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";

// ✅ Support Page
import SupportPage from "./pages/SupportPage";

// Layout
import AdminLayout from "./layouts/AdminLayout";

// ❌ removed unused TicketStatus import

// 404 Page
function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen text-white">
      <h1 className="text-2xl">404 - Page Not Found</h1>
    </div>
  );
}

// ✅ Better QueryClient config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />

        <Routes>
          <Route element={<AdminLayout />}>

            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* Users */}
            <Route path="/users">
              <Route index element={<UsersPage />} />
              <Route path=":id" element={<UserProfile />} />
            </Route>

            {/* Bookings */}
            <Route path="/bookings">
              <Route index element={<BookingsPage />} />
              <Route path=":id" element={<BookingDetailsPage />} />
            </Route>

            {/* Providers */}
            <Route path="/providers">
              <Route index element={<ProvidersPage />} />
              <Route path=":id" element={<ProviderVerification />} />
            </Route>

            {/* Services */}
            <Route path="/services" element={<ServicesPage />} />

            {/* Banners */}
            <Route path="/banners" element={<BannersPage />} />

            {/* Reviews */}
            <Route path="/reviews" element={<ReviewsPage />} />

            {/* Payouts */}
            <Route path="/payouts" element={<PayoutsPage />} />

            {/* Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Activity Logs */}
            <Route path="/activity-logs" element={<ActivityLogsPage />} />

            {/* ✅ NEW: Support Tickets */}
            <Route path="/support" element={<SupportPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />

          </Route>
        </Routes>

      </BrowserRouter>
    </QueryClientProvider>
  );
}