import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";

import { DataState, DataTable } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  assignAdminSubscriptionPartner,
  assignAdminSubscriptionVisitPartner,
  getAdminSubscriptionAssignment,
  getAdminSubscriptionCalendar,
  getAdminSubscriptionDetail,
  replaceAdminSubscriptionPartner,
  updateAdminSubscriptionStatus,
  updateAdminSubscriptionVisitStatus,
} from "../api/subscriptionsApi";
import type { AdminSubscriptionStatus, AdminSubscriptionVisit, AdminSubscriptionVisitStatus } from "../types";

const subscriptionStatuses: AdminSubscriptionStatus[] = ["ACTIVE", "CANCELLED", "COMPLETED"];
const visitStatuses: AdminSubscriptionVisitStatus[] = ["SCHEDULED", "COMPLETED", "SKIPPED", "CANCELLED"];

function DetailCard({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{value == null || value === "" ? "-" : String(value)}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const classes =
    normalized === "ACTIVE" || normalized === "COMPLETED" || normalized === "ASSIGNED"
      ? "bg-emerald-500/20 text-emerald-300"
      : normalized === "CANCELLED" || normalized === "SKIPPED"
        ? "bg-rose-500/20 text-rose-300"
        : "bg-blue-500/20 text-blue-300";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

export default function SubscriptionDetailsPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [subscriptionStatus, setSubscriptionStatus] = useState<AdminSubscriptionStatus>("ACTIVE");
  const [partnerForm, setPartnerForm] = useState({ partnerId: "", reason: "" });
  const [replaceForm, setReplaceForm] = useState({ partnerId: "", reason: "" });
  const [visitPartnerForms, setVisitPartnerForms] = useState<Record<number, { partnerId: string; reason: string }>>({});

  const detailQuery = useQuery({
    queryKey: ["admin-subscription-detail", id],
    queryFn: () => getAdminSubscriptionDetail(id),
    enabled: Boolean(id),
    retry: false,
  });
  const calendarQuery = useQuery({
    queryKey: ["admin-subscription-calendar", id],
    queryFn: () => getAdminSubscriptionCalendar(id),
    enabled: Boolean(id),
    retry: false,
  });
  const assignmentQuery = useQuery({
    queryKey: ["admin-subscription-assignment", id],
    queryFn: () => getAdminSubscriptionAssignment(id),
    enabled: Boolean(id),
    retry: false,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-detail", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-calendar", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-assignment", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }),
    ]);
  };

  const subscriptionStatusMutation = useMutation({
    mutationFn: (status: AdminSubscriptionStatus) => updateAdminSubscriptionStatus(id, status),
    onSuccess: async () => {
      toast.success("Subscription status updated");
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update subscription status")),
  });

  const visitStatusMutation = useMutation({
    mutationFn: ({ visitId, status }: { visitId: number; status: AdminSubscriptionVisitStatus }) =>
      updateAdminSubscriptionVisitStatus(id, visitId, status),
    onSuccess: async () => {
      toast.success("Visit status updated");
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update visit status")),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { partnerId: number; reason: string }) => assignAdminSubscriptionPartner(id, payload),
    onSuccess: async () => {
      toast.success("Partner assigned");
      setPartnerForm({ partnerId: "", reason: "" });
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to assign partner")),
  });

  const replaceMutation = useMutation({
    mutationFn: (payload: { partnerId: number; reason: string }) => replaceAdminSubscriptionPartner(id, payload),
    onSuccess: async () => {
      toast.success("Replacement partner assigned");
      setReplaceForm({ partnerId: "", reason: "" });
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to replace partner")),
  });

  const visitAssignMutation = useMutation({
    mutationFn: ({ visitId, payload }: { visitId: number; payload: { partnerId: number; reason: string } }) =>
      assignAdminSubscriptionVisitPartner(id, visitId, payload),
    onSuccess: async (_data, variables) => {
      toast.success("Visit partner assigned");
      setVisitPartnerForms((current) => ({ ...current, [variables.visitId]: { partnerId: "", reason: "" } }));
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to assign visit partner")),
  });

  const detail = detailQuery.data;
  const visits = useMemo(() => {
    const rows = calendarQuery.data?.length ? calendarQuery.data : detail?.visitsList ?? [];
    return [...rows].sort((first, second) =>
      String(first.visitDate ?? first.date ?? "").localeCompare(String(second.visitDate ?? second.date ?? "")),
    );
  }, [calendarQuery.data, detail?.visitsList]);

  const submitPartner = (event: FormEvent<HTMLFormElement>, mode: "assign" | "replace") => {
    event.preventDefault();
    const form = mode === "assign" ? partnerForm : replaceForm;
    const partnerId = Number(form.partnerId);
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      toast.error("Partner ID is required");
      return;
    }
    const payload = { partnerId, reason: form.reason.trim() };
    if (mode === "assign") assignMutation.mutate(payload);
    else replaceMutation.mutate(payload);
  };

  const submitVisitPartner = (event: FormEvent<HTMLFormElement>, visit: AdminSubscriptionVisit) => {
    event.preventDefault();
    const visitId = visit.id;
    const form = visitPartnerForms[visitId] ?? { partnerId: "", reason: "" };
    const partnerId = Number(form.partnerId);
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      toast.error("Partner ID is required");
      return;
    }
    visitAssignMutation.mutate({ visitId, payload: { partnerId, reason: form.reason.trim() } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/subscriptions" className="text-xs text-blue-300">
            Back to subscriptions
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Subscription #{id}</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage status, visits and partner assignment</p>
        </div>
        {detail ? <StatusBadge status={detail.status} /> : null}
      </div>

      <DataState
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        isEmpty={!detail}
        loadingText="Loading subscription..."
        errorText="Failed to load subscription"
        emptyText="Subscription not found"
        onRetry={() => {
          void detailQuery.refetch();
          void calendarQuery.refetch();
          void assignmentQuery.refetch();
        }}
      >
        {detail ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <DetailCard label="Customer" value={detail.customerName || detail.customerId} />
              <DetailCard label="Service" value={detail.serviceName || detail.serviceId} />
              <DetailCard label="Frequency" value={detail.frequency} />
              <DetailCard label="Period" value={`${detail.startDate || "-"} to ${detail.endDate || "-"}`} />
              <DetailCard label="Visits" value={detail.visits ?? visits.length} />
              <DetailCard label="Duration" value={detail.durationHours ? `${detail.durationHours} hrs` : undefined} />
              <DetailCard label="Time Slot" value={detail.timeSlot} />
              <DetailCard label="Amount" value={detail.finalAmount} />
            </div>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Subscription Status</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={subscriptionStatus}
                  onChange={(event) => setSubscriptionStatus(event.target.value as AdminSubscriptionStatus)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  {subscriptionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={subscriptionStatusMutation.isPending}
                  onClick={() => subscriptionStatusMutation.mutate(subscriptionStatus)}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Current Assignment</h3>
                {assignmentQuery.isLoading ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Loading assignment...</p>
                ) : assignmentQuery.data ? (
                  <div className="mt-3 grid gap-2 text-sm text-[var(--color-text)]">
                    <p>Partner: {assignmentQuery.data.partnerName || assignmentQuery.data.partnerId || "-"}</p>
                    <p>Status: {assignmentQuery.data.status || "-"}</p>
                    <p>Replacement: {assignmentQuery.data.replacementPartnerName || assignmentQuery.data.replacementPartnerId || "-"}</p>
                    <p>Reason: {assignmentQuery.data.replacementReason || "-"}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">No assignment found</p>
                )}
              </div>

              <div className="grid gap-4">
                <form onSubmit={(event) => submitPartner(event, "assign")} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">Assign Subscription Partner</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={partnerForm.partnerId}
                      onChange={(event) => setPartnerForm((prev) => ({ ...prev, partnerId: event.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder="Partner ID"
                      className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <input
                      value={partnerForm.reason}
                      onChange={(event) => setPartnerForm((prev) => ({ ...prev, reason: event.target.value }))}
                      placeholder="Reason"
                      className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                      Assign
                    </button>
                  </div>
                </form>

                <form onSubmit={(event) => submitPartner(event, "replace")} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">Replace Subscription Partner</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={replaceForm.partnerId}
                      onChange={(event) => setReplaceForm((prev) => ({ ...prev, partnerId: event.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder="Partner ID"
                      className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <input
                      value={replaceForm.reason}
                      onChange={(event) => setReplaceForm((prev) => ({ ...prev, reason: event.target.value }))}
                      placeholder="Reason"
                      className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white">
                      Replace
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Visit Calendar</h3>
                <p className="text-xs text-[var(--color-muted)]">Update visit status or assign a partner for one visit only.</p>
              </div>
              <DataState
                isLoading={calendarQuery.isLoading}
                isError={calendarQuery.isError}
                isEmpty={visits.length === 0}
                loadingText="Loading visits..."
                errorText="Failed to load visits"
                emptyText="No visits found"
                onRetry={() => void calendarQuery.refetch()}
              >
                <DataTable
                  rows={visits}
                  rowKey={(visit) => String(visit.id)}
                  columns={[
                    { key: "date", header: "Date", render: (visit) => visit.visitDate || visit.date || "-" },
                    { key: "slot", header: "Slot", render: (visit) => visit.timeSlot || "-" },
                    { key: "partner", header: "Partner", render: (visit) => visit.partnerName || visit.partnerId || "-" },
                    {
                      key: "status",
                      header: "Status",
                      render: (visit) => (
                        <select
                          value={visit.status}
                          onChange={(event) =>
                            visitStatusMutation.mutate({
                              visitId: visit.id,
                              status: event.target.value as AdminSubscriptionVisitStatus,
                            })
                          }
                          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
                        >
                          {visitStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ),
                    },
                    {
                      key: "assign",
                      header: "Visit Partner",
                      render: (visit) => {
                        const form = visitPartnerForms[visit.id] ?? { partnerId: "", reason: "" };
                        return (
                          <form onSubmit={(event) => submitVisitPartner(event, visit)} className="grid min-w-80 gap-2">
                            <div className="flex gap-2">
                              <input
                                value={form.partnerId}
                                onChange={(event) =>
                                  setVisitPartnerForms((current) => ({
                                    ...current,
                                    [visit.id]: { ...form, partnerId: event.target.value.replace(/[^0-9]/g, "") },
                                  }))
                                }
                                placeholder="Partner ID"
                                className="w-24 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                              />
                              <input
                                value={form.reason}
                                onChange={(event) =>
                                  setVisitPartnerForms((current) => ({
                                    ...current,
                                    [visit.id]: { ...form, reason: event.target.value },
                                  }))
                                }
                                placeholder="Reason"
                                className="flex-1 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                              />
                              <button type="submit" className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300">
                                Assign
                              </button>
                            </div>
                          </form>
                        );
                      },
                    },
                  ]}
                />
              </DataState>
            </section>
          </>
        ) : null}
      </DataState>
    </div>
  );
}
