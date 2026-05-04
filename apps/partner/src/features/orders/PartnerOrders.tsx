import { Button, Card } from '@lexho/ui'
import { useMemo } from 'react'

import { fetchPartnerOrders } from '@/api/partner'
import { partnerOrders } from '@/data/partnerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

export function PartnerOrders() {
  const resource = useRemoteResource(fetchPartnerOrders, partnerOrders)
  const orders = resource.data.length > 0 ? resource.data : partnerOrders

  const summary = useMemo(() => {
    return {
      assigned: orders.filter((order) => order.status === 'ASSIGNED').length,
      inProgress: orders.filter((order) => order.status === 'IN_PROGRESS').length,
      completed: orders.filter((order) => order.status === 'COMPLETED').length
    }
  }, [orders])

  return (
    <div className="stack">
      <section className="metrics">
        <Card className="metric-card">
          <p className="metric-label">Assigned</p>
          <h3 className="metric-value">{summary.assigned}</h3>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">In Progress</p>
          <h3 className="metric-value">{summary.inProgress}</h3>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Completed</p>
          <h3 className="metric-value">{summary.completed}</h3>
        </Card>
      </section>

      <Card className="panel light-panel">
        <div className="panel-header">
          <h2>Orders</h2>
          <Button
            label={resource.refreshing ? 'Refreshing...' : 'Refresh Orders'}
            variant="green"
            loading={resource.refreshing}
            onClick={() => void resource.reload()}
          />
        </div>

        {resource.loading ? <p className="item-subtitle">Loading orders...</p> : null}
        {resource.error ? <p className="error-text">Unable to fetch latest orders. Showing fallback data.</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Schedule</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.service}</td>
                  <td>{order.schedule}</td>
                  <td>Rs {order.amount}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
