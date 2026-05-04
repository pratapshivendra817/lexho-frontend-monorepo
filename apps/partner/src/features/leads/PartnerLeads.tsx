import { Button, Card } from '@lexho/ui'
import { useMemo, useState } from 'react'

import { fetchPartnerLeads, updatePartnerLeadStatus } from '@/api/partner'
import { partnerLeads, type PartnerLead } from '@/data/partnerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

const leadStatusTabs: Array<PartnerLead['status'] | 'ALL'> = [
  'ALL',
  'NEW',
  'ACCEPTED',
  'COMPLETED'
]

export function PartnerLeads() {
  const [statusFilter, setStatusFilter] = useState<PartnerLead['status'] | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const resource = useRemoteResource(fetchPartnerLeads, partnerLeads)

  const filteredLeads = useMemo(() => {
    const base = resource.data.length > 0 ? resource.data : partnerLeads

    return base
      .filter((lead) => (statusFilter === 'ALL' ? true : lead.status === statusFilter))
      .filter((lead) =>
        `${lead.customer} ${lead.service} ${lead.area}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  }, [resource.data, search, statusFilter])

  const updateStatus = async (lead: PartnerLead, status: PartnerLead['status']) => {
    const previousLeads = resource.data
    setUpdatingLeadId(lead.id)

    resource.setData((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status } : item))
    )

    try {
      await updatePartnerLeadStatus(lead.id, status)
    } catch {
      resource.setData(previousLeads)
    } finally {
      setUpdatingLeadId(null)
    }
  }

  return (
    <Card className="panel light-panel">
      <div className="panel-header">
        <h2>Leads</h2>
        <Button
          label={resource.refreshing ? 'Refreshing...' : 'Refresh Leads'}
          variant="green"
          loading={resource.refreshing}
          onClick={() => void resource.reload()}
        />
      </div>

      <div className="filters-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer, service, area"
          className="text-input"
        />
        <div className="tab-row">
          {leadStatusTabs.map((tab) => (
            <button
              key={tab}
              className={`tab-button ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {resource.loading ? <p className="item-subtitle">Loading leads...</p> : null}
      {resource.error ? <p className="error-text">Unable to fetch latest leads. Showing fallback data.</p> : null}
      {!resource.loading && filteredLeads.length === 0 ? <p className="item-subtitle">No leads found.</p> : null}

      <div className="list">
        {filteredLeads.map((lead) => (
          <div className="list-item light" key={lead.id}>
            <div>
              <p className="item-title">{lead.service}</p>
              <p className="item-subtitle">{lead.customer}</p>
              <p className="item-subtitle">{lead.area}</p>
            </div>
            <div className="item-right">
              <p className="item-status">{lead.status}</p>
              <p className="item-price">Rs {lead.payout}</p>
              <div className="inline-actions">
                {lead.status === 'NEW' ? (
                  <button
                    className="small-action"
                    onClick={() => void updateStatus(lead, 'ACCEPTED')}
                    disabled={updatingLeadId === lead.id}
                  >
                    Accept
                  </button>
                ) : null}
                {lead.status === 'ACCEPTED' ? (
                  <button
                    className="small-action"
                    onClick={() => void updateStatus(lead, 'COMPLETED')}
                    disabled={updatingLeadId === lead.id}
                  >
                    Complete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
