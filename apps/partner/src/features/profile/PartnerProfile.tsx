import { Button, Card, Input } from '@lexho/ui'
import { useMemo, useState } from 'react'

import { fetchPartnerProfile, updatePartnerProfile } from '@/api/partner'
import { partnerProfile } from '@/data/partnerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

export function PartnerProfile() {
  const resource = useRemoteResource(fetchPartnerProfile, partnerProfile)
  const profile = resource.data ?? partnerProfile

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    city: profile.city
  })

  const canSave = useMemo(() => {
    return form.fullName.trim().length > 0 && form.phone.trim().length > 0 && form.city.trim().length > 0
  }, [form.city, form.fullName, form.phone])

  const startEdit = () => {
    setForm({
      fullName: profile.fullName,
      phone: profile.phone,
      city: profile.city
    })
    setEditing(true)
  }

  const save = async () => {
    if (!canSave) {
      return
    }

    const nextProfile = {
      ...profile,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      city: form.city.trim()
    }

    resource.setData(nextProfile)
    setSaving(true)

    try {
      const updated = await updatePartnerProfile({
        fullName: nextProfile.fullName,
        phone: nextProfile.phone,
        city: nextProfile.city
      })

      if (updated) {
        resource.setData(updated)
      }
      setEditing(false)
    } catch {
      resource.setData(profile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="panel light-panel">
      <div className="panel-header">
        <h2>Profile</h2>
        {!editing ? (
          <Button label="Edit Profile" variant="green" onClick={startEdit} />
        ) : (
          <div className="inline-actions">
            <Button label="Cancel" onClick={() => setEditing(false)} />
            <Button
              label={saving ? 'Saving...' : 'Save'}
              variant="green"
              loading={saving}
              onClick={() => void save()}
              disabled={!canSave}
            />
          </div>
        )}
      </div>

      {resource.loading ? <p className="item-subtitle">Loading profile...</p> : null}
      {resource.error ? <p className="error-text">Unable to fetch latest profile. Showing fallback data.</p> : null}

      <div className="profile-grid">
        <div>
          <p className="field-label">Full Name</p>
          {editing ? (
            <Input value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} />
          ) : (
            <p className="field-value">{profile.fullName}</p>
          )}
        </div>
        <div>
          <p className="field-label">Phone</p>
          {editing ? (
            <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          ) : (
            <p className="field-value">{profile.phone}</p>
          )}
        </div>
        <div>
          <p className="field-label">Email</p>
          <p className="field-value">{profile.email}</p>
        </div>
        <div>
          <p className="field-label">City</p>
          {editing ? (
            <Input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
          ) : (
            <p className="field-value">{profile.city}</p>
          )}
        </div>
        <div>
          <p className="field-label">KYC Status</p>
          <p className="field-value">{profile.kycStatus}</p>
        </div>
        <div>
          <p className="field-label">Rating</p>
          <p className="field-value">{profile.rating}</p>
        </div>
        <div>
          <p className="field-label">Completed Jobs</p>
          <p className="field-value">{profile.completedJobs}</p>
        </div>
      </div>

      <div>
        <p className="field-label">Services</p>
        <div className="tag-wrap">
          {profile.services.map((service) => (
            <span key={service} className="tag">
              {service}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}
