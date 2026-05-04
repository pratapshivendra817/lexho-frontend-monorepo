import { useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { PartnerDashboard, partnerDashboardFeatureFlag } from './features/dashboard'
import { PartnerLeads } from './features/leads'
import { PartnerOrders } from './features/orders'
import { PartnerPayouts } from './features/payouts'
import { PartnerProfile } from './features/profile'
import { ProviderNotificationsPage } from './modules/notifications'
import { ProviderOnboardingPage } from './modules/providers'
import { ProviderReviewsPage } from './modules/reviews'
import { partnerNavigation, type PartnerTabKey } from './navigation/partnerNavigation'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
})

function App() {
  const [activeTab, setActiveTab] = useState<PartnerTabKey>('onboarding')

  const content = useMemo(() => {
    if (activeTab === 'onboarding') return <ProviderOnboardingPage />
    if (activeTab === 'notifications') return <ProviderNotificationsPage />
    if (activeTab === 'reviews') return <ProviderReviewsPage />
    if (activeTab === 'leads') return <PartnerLeads />
    if (activeTab === 'orders') return <PartnerOrders />
    if (activeTab === 'payouts') return <PartnerPayouts />
    if (activeTab === 'profile') return <PartnerProfile />
    return <PartnerDashboard />
  }, [activeTab])

  return (
    <QueryClientProvider client={queryClient}>
      <main className="page">
        <Toaster position="top-right" />
        <div className="container">
          <header className="app-header">
            <h1>Lexho Partner App</h1>
            <p>Tabs: {partnerNavigation.appTabs.join(', ')}</p>
            <p>Dashboard enabled: {partnerDashboardFeatureFlag ? 'Yes' : 'No'}</p>
          </header>

          <nav className="app-tabs">
            {partnerNavigation.tabItems.map((tab) => (
              <button
                key={tab.key}
                className={`app-tab ${tab.key === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {content}
        </div>
      </main>
    </QueryClientProvider>
  )
}

export default App
