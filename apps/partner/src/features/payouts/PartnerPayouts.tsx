import { Button, Card } from '@lexho/ui'
import { useMemo } from 'react'

import { fetchPartnerPayouts } from '@/api/partner'
import { partnerPayouts } from '@/data/partnerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

export function PartnerPayouts() {
  const resource = useRemoteResource(fetchPartnerPayouts, partnerPayouts)
  const payouts = resource.data.length > 0 ? resource.data : partnerPayouts

  const summary = useMemo(() => {
    const totalPaid = payouts
      .filter((payout) => payout.status === 'PAID')
      .reduce((acc, payout) => acc + payout.netAmount, 0)

    const processing = payouts
      .filter((payout) => payout.status === 'PROCESSING')
      .reduce((acc, payout) => acc + payout.netAmount, 0)

    return { totalPaid, processing }
  }, [payouts])

  return (
    <div className="stack">
      <section className="metrics">
        <Card className="metric-card">
          <p className="metric-label">Total Paid</p>
          <h3 className="metric-value">Rs {summary.totalPaid}</h3>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Processing</p>
          <h3 className="metric-value">Rs {summary.processing}</h3>
        </Card>
      </section>

      <Card className="panel light-panel">
        <div className="panel-header">
          <h2>Payout History</h2>
          <Button
            label={resource.refreshing ? 'Refreshing...' : 'Refresh Payouts'}
            variant="green"
            loading={resource.refreshing}
            onClick={() => void resource.reload()}
          />
        </div>

        {resource.loading ? <p className="item-subtitle">Loading payouts...</p> : null}
        {resource.error ? <p className="error-text">Unable to fetch latest payouts. Showing fallback data.</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Jobs</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.period}</td>
                  <td>{payout.completedJobs}</td>
                  <td>Rs {payout.grossAmount}</td>
                  <td>Rs {payout.deductions}</td>
                  <td>Rs {payout.netAmount}</td>
                  <td>{payout.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
