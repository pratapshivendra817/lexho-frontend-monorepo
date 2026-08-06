import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";
import { shareContent } from "@/utils/share";

import { useAdminNotificationMutations } from "../../notifications/hooks/useAdminNotifications";
import { downloadPartnerDocument } from "../api/partnersApi";
import { PartnerStatusBadge } from "../components";
import { usePartnerDashboardStatsQuery, usePartnerDetailsQuery, usePartnerMutations } from "../hooks/usePartners";

export default function PartnerDetailsPage() {
  const { id } = useParams();
  const detailsQuery = usePartnerDetailsQuery(id);
  const statsQuery = usePartnerDashboardStatsQuery(id);
  const {
    updatePartnerAvailabilityMutation,
    reviewPartnerKycDocumentMutation,
    forcePartnerAvailabilityMutation,
    updatePartnerSkillsGovernanceMutation,
    runPartnerRiskActionMutation,
  } = usePartnerMutations();
  const { sendMutation } = useAdminNotificationMutations();
  const [lockMinutes, setLockMinutes] = useState("1440");
  const [forceReason, setForceReason] = useState("Quality audit hold");
  const [categoryIds, setCategoryIds] = useState("");
  const [subServiceIds, setSubServiceIds] = useState("");
  const [riskReason, setRiskReason] = useState("Fraudulent behavior detected");
  const [warningType, setWarningType] = useState("QUALITY");
  const [warningReason, setWarningReason] = useState("Service quality issue detected");
  const [warningGuidance, setWarningGuidance] = useState("Please review the issue and avoid repeating it.");
  const [warningTitle, setWarningTitle] = useState("New Warning Issued");
  const [warningMessage, setWarningMessage] = useState("A new warning has been issued to your account. Tap to view the details.");

  const partner = detailsQuery.data;
  const stats = statsQuery.data;
  const online = Boolean(partner?.online);
  const numericPartnerId = Number(partner?.id);
  const canTargetPartnerById = Number.isFinite(numericPartnerId) && numericPartnerId > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Partner Details</h2>
          <p className="text-sm text-[var(--color-muted)]">Review profile, documents and governance controls</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!partner}
            onClick={() => {
              if (!partner) return;
              void shareContent({
                title: `Partner ${partner.name || partner.id}`,
                text: `Status: ${partner.status}\nCity: ${partner.city || "-"}\nService: ${partner.serviceType || "-"}\nPhone: ${partner.phone || "-"}`,
                url: window.location.href,
                successMessage: "Partner details copied",
              });
            }}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Share
          </button>
          <Link to="/partners" className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm">
            Back
          </Link>
        </div>
      </div>

      <DataState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        isEmpty={!partner}
        loadingText="Loading partner details..."
        errorText="Unable to load partner details"
        emptyText="Partner not found"
        onRetry={() => void detailsQuery.refetch()}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 xl:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Profile</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Partner ID" value={partner?.id} />
              <InfoRow label="Name" value={partner?.name} />
              <InfoRow label="Email" value={partner?.email} />
              <InfoRow label="Phone" value={partner?.phone} />
              <InfoRow label="City" value={partner?.city} />
              <InfoRow label="State" value={partner?.state} />
              <InfoRow label="Address" value={partner?.address} full />
              <InfoRow label="Service Type" value={partner?.serviceType} />
              <InfoRow label="Bank A/C" value={partner?.accountNumber} />
              <InfoRow label="IFSC" value={partner?.ifscCode} />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Status</h3>
            {partner ? <PartnerStatusBadge status={partner.status} /> : null}
            <div className="mt-4 rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Availability</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text)]">{online ? "Online" : "Offline"}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!partner) return;
                    const nextOnline = !online;
                    updatePartnerAvailabilityMutation.mutate(
                      { id: partner.id, online: nextOnline },
                      {
                        onSuccess: () => toast.success(`Partner marked ${nextOnline ? "Online" : "Offline"}`),
                        onError: (error) => toast.error(extractApiError(error, "Failed to update availability")),
                      },
                    );
                  }}
                  disabled={updatePartnerAvailabilityMutation.isPending}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold bg-zinc-500/20 text-zinc-300"
                >
                  {updatePartnerAvailabilityMutation.isPending ? "Updating..." : online ? "Set Offline" : "Set Online"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Governance Controls</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Force Availability</p>
              <input value={lockMinutes} onChange={(event) => setLockMinutes(event.target.value)} placeholder="Lock minutes" className="mt-2 w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs" />
              <input value={forceReason} onChange={(event) => setForceReason(event.target.value)} placeholder="Reason" className="mt-2 w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs" />
              <button
                type="button"
                className="mt-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                onClick={() => {
                  if (!partner) return;
                  forcePartnerAvailabilityMutation.mutate(
                    { partnerId: partner.id, online: false, lockMinutes: Number(lockMinutes) || 0, reason: forceReason },
                    {
                      onSuccess: () => toast.success("Availability force-updated"),
                      onError: (error) => toast.error(extractApiError(error, "Force availability failed")),
                    },
                  );
                }}
              >
                Force Offline
              </button>
            </div>
            <div className="rounded border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Skills Governance</p>
              <input value={categoryIds} onChange={(event) => setCategoryIds(event.target.value)} placeholder="Category IDs (1,2)" className="mt-2 w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs" />
              <input value={subServiceIds} onChange={(event) => setSubServiceIds(event.target.value)} placeholder="SubService IDs (11,12)" className="mt-2 w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs" />
              <button
                type="button"
                className="mt-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                onClick={() => {
                  if (!partner) return;
                  const cids = categoryIds.split(",").map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
                  const sids = subServiceIds.split(",").map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
                  updatePartnerSkillsGovernanceMutation.mutate(
                    { partnerId: partner.id, categoryIds: cids, subServiceIds: sids },
                    {
                      onSuccess: () => toast.success("Skills updated"),
                      onError: (error) => toast.error(extractApiError(error, "Skills update failed")),
                    },
                  );
                }}
              >
                Update Skills
              </button>
            </div>
            <div className="rounded border border-[var(--color-border)] p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Risk / Fraud Actions</p>
              <input value={riskReason} onChange={(event) => setRiskReason(event.target.value)} placeholder="Reason" className="mt-2 w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs" />
              <div className="mt-2 flex flex-wrap gap-2">
                {["SOFT_BLOCK", "HARD_BLOCK", "UNBLOCK", "FLAG_FRAUD"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                    onClick={() => {
                      if (!partner) return;
                      runPartnerRiskActionMutation.mutate(
                        { partnerId: partner.id, action: action as "SOFT_BLOCK" | "HARD_BLOCK" | "UNBLOCK" | "FLAG_FRAUD", reason: riskReason },
                        {
                          onSuccess: () => toast.success(`${action} applied`),
                          onError: (error) => toast.error(extractApiError(error, "Risk action failed")),
                        },
                      );
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded border border-[var(--color-border)] p-3 md:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Issue Warning</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Sends a partner warning notification using the existing admin notifications flow.
                  </p>
                </div>
                {!canTargetPartnerById ? (
                  <span className="rounded-full border border-amber-500/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Numeric partner ID required
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={warningType}
                  onChange={(event) => setWarningType(event.target.value)}
                  placeholder="Warning type"
                  className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                />
                <input
                  value={warningTitle}
                  onChange={(event) => setWarningTitle(event.target.value)}
                  placeholder="Notification title"
                  className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                />
                <textarea
                  value={warningReason}
                  onChange={(event) => setWarningReason(event.target.value)}
                  placeholder="Reason"
                  rows={3}
                  className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
                />
                <textarea
                  value={warningGuidance}
                  onChange={(event) => setWarningGuidance(event.target.value)}
                  placeholder="Guidance"
                  rows={3}
                  className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
                />
                <textarea
                  value={warningMessage}
                  onChange={(event) => setWarningMessage(event.target.value)}
                  placeholder="Notification message"
                  rows={3}
                  className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!partner || !canTargetPartnerById || sendMutation.isPending}
                  className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    if (!partner || !canTargetPartnerById) return;
                    const nextWarningType = warningType.trim() || "WARNING";
                    const nextReason = warningReason.trim();
                    const nextGuidance = warningGuidance.trim();
                    const nextTitle = warningTitle.trim() || "New Warning Issued";
                    const nextMessage = warningMessage.trim() || "A new warning has been issued to your account. Tap to view the details.";

                    if (!nextReason) {
                      toast.error("Warning reason is required");
                      return;
                    }

                    sendMutation.mutate(
                      {
                        title: nextTitle,
                        message: nextMessage,
                        notificationType: "WARNING",
                        priority: "HIGH",
                        channels: ["IN_APP", "PUSH"],
                        targetUserType: "PARTNERS",
                        userIds: [numericPartnerId],
                        referenceType: "WARNING",
                        referenceId: partner.id,
                        redirectType: "WARNING",
                        redirectValue: partner.id,
                        city: partner.city || undefined,
                        warningType: nextWarningType,
                        reason: nextReason,
                        guidance: nextGuidance || undefined,
                        notificationTitle: nextTitle,
                        notificationMessage: nextMessage,
                      },
                      {
                        onSuccess: () => {
                          toast.success("Warning sent to partner");
                          setWarningMessage("A new warning has been issued to your account. Tap to view the details.");
                        },
                        onError: (error) => toast.error(extractApiError(error, "Failed to send warning")),
                      },
                    );
                  }}
                >
                  {sendMutation.isPending ? "Sending Warning..." : "Send Warning"}
                </button>
                <p className="text-xs text-[var(--color-muted)]">
                  Backend should persist the warning details separately if it needs to appear inside the partner Warnings screen.
                </p>
              </div>
              <div className="mt-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Warning Payload Preview</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-[var(--color-text)]">
{JSON.stringify({
  warningType: warningType.trim() || "WARNING",
  reason: warningReason.trim(),
  guidance: warningGuidance.trim() || undefined,
  notificationTitle: warningTitle.trim() || "New Warning Issued",
  notificationMessage: warningMessage.trim() || "A new warning has been issued to your account. Tap to view the details.",
  redirectType: "WARNING",
  targetUserType: "PARTNERS",
  userIds: canTargetPartnerById ? [numericPartnerId] : [],
}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Dashboard Stats</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatItem label="Today Earnings" value={`INR ${stats?.todayEarnings ?? 0}`} />
            <StatItem label="Completed Orders" value={String(stats?.totalCompletedOrders ?? 0)} />
            <StatItem label="Pending Orders" value={String(stats?.pendingOrders ?? 0)} />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Documents</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {partner?.documents.length ? (
              partner.documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-sm font-medium text-[var(--color-text)]">{document.name || document.documentType}</p>
                  <p className="text-xs text-[var(--color-muted)]">{document.documentType}</p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
                    onClick={() => {
                      if (!partner) return;
                      if (!document.previewUrl) {
                        toast.error("Document URL not available");
                        return;
                      }
                      downloadPartnerDocument(partner.id, document.id, document.previewUrl).catch((error) => {
                        toast.error(extractApiError(error, "Unable to download document"));
                      });
                    }}
                  >
                    Download
                  </button>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300"
                      onClick={() => {
                        if (!partner) return;
                        reviewPartnerKycDocumentMutation.mutate(
                          { partnerId: partner.id, documentId: document.id, decision: "APPROVED", reason: "Document is clear and valid" },
                          {
                            onSuccess: () => toast.success("Document approved"),
                            onError: (error) => toast.error(extractApiError(error, "KYC review failed")),
                          },
                        );
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300"
                      onClick={() => {
                        if (!partner) return;
                        reviewPartnerKycDocumentMutation.mutate(
                          { partnerId: partner.id, documentId: document.id, decision: "REJECTED", reason: "Document mismatch" },
                          {
                            onSuccess: () => toast.success("Document rejected"),
                            onError: (error) => toast.error(extractApiError(error, "KYC review failed")),
                          },
                        );
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No documents uploaded.</p>
            )}
          </div>
        </section>
      </DataState>
    </div>
  );
}

function InfoRow({ label, value, full = false }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-text)]">{value && value.length > 0 ? value : "-"}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
