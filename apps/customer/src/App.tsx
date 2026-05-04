import { useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { CustomerBookings } from './features/bookings'
import { CustomerHome } from './features/home'
import { CustomerProfile } from './features/profile'
import { CustomerNotificationsPage } from './modules/notifications'
import { CustomerReviewsPage } from './modules/reviews'
import { customerNavigation, type CustomerTabKey } from './navigation/customerNavigation'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
})

function App() {
  const [activeTab, setActiveTab] = useState<CustomerTabKey>('home')

  const content = useMemo(() => {
    if (activeTab === 'notifications') return <CustomerNotificationsPage />
    if (activeTab === 'reviews') return <CustomerReviewsPage />
    if (activeTab === 'bookings') return <CustomerBookings />
    if (activeTab === 'profile') return <CustomerProfile />
    return <CustomerHome />
  }, [activeTab])

  return (
    <QueryClientProvider client={queryClient}>
      <main className="page">
        <Toaster position="top-right" />
        <div className="container">
          <header className="app-header">
            <h1>Lexho Customer App</h1>
            <p>Tabs: {customerNavigation.appTabs.join(', ')}</p>
            <p>Modern web shell with feature-level data fallback.</p>
          </header>

          <nav className="app-tabs">
            {customerNavigation.tabItems.map((tab) => (
              <button
                key={tab.key}
                className={`app-tab ${activeTab === tab.key ? 'active' : ''}`}
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
