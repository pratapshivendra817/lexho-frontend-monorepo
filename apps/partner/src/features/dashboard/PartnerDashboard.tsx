import { Button, Card } from '@lexho/ui'

import { fetchPartnerLeads, fetchPartnerMetrics } from '@/api/partner'
import { useRemoteResource } from '@/hooks/useRemoteResource'
import { partnerLeads, partnerMetrics } from '@/data/partnerData'

export function PartnerDashboard() {
  const metricsResource = useRemoteResource(fetchPartnerMetrics, partnerMetrics)
  const leadsResource = useRemoteResource(fetchPartnerLeads, partnerLeads)

  const metrics =
    metricsResource.data.length > 0 ? metricsResource.data : partnerMetrics
  const leads = leadsResource.data.length > 0 ? leadsResource.data : partnerLeads

  const refreshAll = async () => {
    await Promise.all([metricsResource.reload(), leadsResource.reload()])
  }

  return (
    <div className="stack">
      <section className="metrics">
        {metrics.map((metric) => (
          <Card key={metric.label} className="metric-card">
            <p className="metric-label">{metric.label}</p>
            <h3 className="metric-value">{metric.value}</h3>
          </Card>
        ))}
      </section>

      <Card className="panel">
        <div className="panel-header">
          <h2>Active Leads</h2>
          <Button
            label={metricsResource.refreshing || leadsResource.refreshing ? 'Refreshing...' : 'Refresh'}
            variant="green"
            loading={metricsResource.refreshing || leadsResource.refreshing}
            onClick={() => void refreshAll()}
          />
        </div>

        {metricsResource.error || leadsResource.error ? (
          <p className="error-text">Showing fallback data because API is unavailable.</p>
        ) : null}

        <div className="list">
          {leads.map((lead) => (
            <div className="list-item" key={lead.id}>
              <div>
                <p className="item-title">{lead.service}</p>
                <p className="item-subtitle">{lead.customer}</p>
                <p className="item-subtitle">{lead.area}</p>
              </div>
              <div className="item-right">
                <p className="item-status">{lead.status}</p>
                <p className="item-price">Rs {lead.payout}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
