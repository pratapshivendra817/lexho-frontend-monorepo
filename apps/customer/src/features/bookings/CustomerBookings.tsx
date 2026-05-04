import { Button, Card } from '@lexho/ui'
import { useMemo, useState } from 'react'

import { cancelCustomerBooking, fetchCustomerBookings } from '@/api/customer'
import { customerBookings, type CustomerBooking } from '@/data/customerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

const bookingTabs: Array<CustomerBooking['status'] | 'ALL'> = [
  'ALL',
  'UPCOMING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]

export function CustomerBookings() {
  const [activeTab, setActiveTab] = useState<CustomerBooking['status'] | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const resource = useRemoteResource(fetchCustomerBookings, customerBookings)
  const bookings = resource.data.length > 0 ? resource.data : customerBookings

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => (activeTab === 'ALL' ? true : booking.status === activeTab))
      .filter((booking) =>
        `${booking.service} ${booking.providerName} ${booking.id}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  }, [activeTab, bookings, search])

  const cancelBooking = async (bookingId: string) => {
    const previous = resource.data
    setCancellingId(bookingId)

    resource.setData((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status: 'CANCELLED' } : booking
      )
    )

    try {
      await cancelCustomerBooking(bookingId)
    } catch {
      resource.setData(previous)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Card className="panel light-panel">
      <div className="panel-header">
        <h2>Bookings</h2>
        <Button
          label={resource.refreshing ? 'Refreshing...' : 'Refresh Bookings'}
          loading={resource.refreshing}
          variant="green"
          onClick={() => void resource.reload()}
        />
      </div>

      <div className="filters-row">
        <input
          className="text-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by service, provider, booking id"
        />

        <div className="tab-row">
          {bookingTabs.map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {resource.loading ? <p className="item-subtitle">Loading bookings...</p> : null}
      {resource.error ? <p className="error-text">Unable to fetch latest bookings. Showing fallback data.</p> : null}
      {!resource.loading && filteredBookings.length === 0 ? <p className="item-subtitle">No bookings found.</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Service</th>
              <th>Provider</th>
              <th>Schedule</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.id}</td>
                <td>{booking.service}</td>
                <td>{booking.providerName}</td>
                <td>{booking.schedule}</td>
                <td>Rs {booking.amount}</td>
                <td>{booking.status}</td>
                <td>
                  {booking.status === 'UPCOMING' || booking.status === 'IN_PROGRESS' ? (
                    <button
                      className="small-action"
                      onClick={() => void cancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
