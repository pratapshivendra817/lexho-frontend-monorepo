import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { PartnerStatusBadge, PartnersFiltersBar, PartnersStatsCards } from "../components";
import { usePartnerMutations, usePartnersQuery, usePartnerSettlementsQuery, usePartnerStatsQuery } from "../hooks/usePartners";
import type { PartnerListItem, PartnerServiceType, PartnerSettlementStatus, PartnerStatus } from "../types";

type ActionModalState =
  | { type: "none" }
  | { type: "approve"; partner: PartnerListItem }
  | { type: "reject"; partner: PartnerListItem }
  | { type: "block"; partner: PartnerListItem }
  | { type: "unblock"; partner: PartnerListItem }
  | { type: "delete"; partner: PartnerListItem };

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

export default function PartnersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [actionState, setActionState] = useState<ActionModalState>({ type: "none" });
  const [reason, setReason] = useState("");
  const [settlementSearch, setSettlementSearch] = useState("");
  const [settlementStatus, setSettlementStatus] = useState<PartnerSettlementStatus | "">("");

  const page = parsePage(searchParams.get("page"));
  const status = (searchParams.get("status") ?? "") as PartnerStatus | "";
  const serviceType = (searchParams.get("serviceType") ?? "") as PartnerServiceType;
  const city = searchParams.get("city") ?? "";
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";

  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set("search", debouncedSearch);
    } else {
      next.delete("search");
    }
    next.set("page", "0");
    setSearchParams(next);
  }, [debouncedSearch, search, searchParams, setSearchParams]);

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.length > 0) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    if (resetPage) {
      next.set("page", "0");
    }
    setSearchParams(next);
  };

  const partnersQuery = usePartnersQuery({
    page,
    size: 10,
    status,
    serviceType,
    city: city || undefined,
    search: search || undefined,
    sortBy,
    sortDir: "desc",
  });
  const statsQuery = usePartnerStatsQuery();
  const {
    approvePartnerMutation,
    rejectPartnerMutation,
    blockPartnerMutation,
    unblockPartnerMutation,
    deletePartnerMutation,
    updateSettlementStatusMutation,
  } = usePartnerMutations();
  const settlementsQuery = usePartnerSettlementsQuery({
    page: 0,
    size: 10,
    search: settlementSearch || undefined,
    status: settlementStatus,
  });

  const rows = partnersQuery.data?.content ?? [];
  const total = partnersQuery.data?.totalElements ?? 0;
  const stats =
    statsQuery.data ?? {
      pending: 0,
      approved: 0,
      rejected: 0,
      blocked: 0,
    };

  const activeAction = actionState.type !== "none" ? actionState : null;
  const isReasonModal = activeAction?.type === "reject" || activeAction?.type === "block";

  const handleActionConfirm = () => {
    if (!activeAction) {
      return;
    }

    const partnerId = activeAction.partner.id;
    if (activeAction.type === "approve") {
      approvePartnerMutation.mutate(partnerId, {
        onSuccess: () => {
          toast.success("Partner approved");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to approve partner")),
      });
      return;
    }

    if (activeAction.type === "unblock") {
      unblockPartnerMutation.mutate(partnerId, {
        onSuccess: () => {
          toast.success("Partner unblocked");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to unblock partner")),
      });
      return;
    }

    if (activeAction.type === "delete") {
      deletePartnerMutation.mutate(partnerId, {
        onSuccess: () => {
          toast.success("Partner deleted");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to delete partner")),
      });
      return;
    }

    if (activeAction.type === "reject") {
      rejectPartnerMutation.mutate(
        { id: partnerId, reason },
        {
          onSuccess: () => {
            toast.success("Partner rejected");
            setReason("");
            setActionState({ type: "none" });
          },
          onError: (error) => toast.error(extractApiError(error, "Failed to reject partner")),
        },
      );
      return;
    }

    blockPartnerMutation.mutate(
      { id: partnerId, reason },
      {
        onSuccess: () => {
          toast.success("Partner blocked");
          setReason("");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to block partner")),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Partner Onboarding Management</h2>
        <p className="text-sm text-[var(--color-muted)]">Review, approve, reject and manage partner onboarding</p>
      </div>

      <PartnersStatsCards stats={stats} />

      <PartnersFiltersBar
        search={searchInput}
        status={status}
        serviceType={serviceType}
        city={city}
        sortBy={sortBy}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => updateParams({ status: value || undefined })}
        onServiceTypeChange={(value) => updateParams({ serviceType: value || undefined })}
        onCityChange={(value) => updateParams({ city: value || undefined })}
        onSortByChange={(value) => updateParams({ sortBy: value })}
        onReset={() =>
          setSearchParams(
            new URLSearchParams({
              page: "0",
              sortBy: "createdAt",
            }),
          )
        }
      />

      <DataState
        isLoading={partnersQuery.isLoading}
        isError={partnersQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading partners..."
        errorText="Failed to load partners"
        emptyText="No partners found"
        onRetry={() => {
          void partnersQuery.refetch();
          void statsQuery.refetch();
        }}
      >
        <DataTable
          rows={rows}
          rowKey={(item) => item.id}
          columns={[
            { key: "id", header: "Partner ID", render: (item) => item.id },
            { key: "name", header: "Name", render: (item) => item.name },
            { key: "phone", header: "Phone", render: (item) => item.phone },
            { key: "serviceType", header: "Service", render: (item) => item.serviceType || "N/A" },
            { key: "city", header: "City", render: (item) => item.city || "N/A" },
            { key: "appliedDate", header: "Applied", render: (item) => item.appliedDate || "-" },
            { key: "status", header: "Status", render: (item) => <PartnerStatusBadge status={item.status} /> },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" to={`/partners/${item.id}`}>
                    View
                  </Link>
                  <button type="button" onClick={() => setActionState({ type: "approve", partner: item })} className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300">
                    Approve
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "reject", partner: item })} className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300">
                    Reject
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "block", partner: item })} className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300">
                    Block
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "unblock", partner: item })} className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300">
                    Unblock
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "delete", partner: item })} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />

        <Pagination
          page={page + 1}
          total={total}
          limit={10}
          onPageChange={(nextPage) => updateParams({ page: String(Math.max(0, nextPage - 1)) }, false)}
        />
      </DataState>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Settlements</h3>
          <div className="flex gap-2">
            <input
              value={settlementSearch}
              onChange={(event) => setSettlementSearch(event.target.value)}
              placeholder="Search payouts"
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
            />
            <select
              value={settlementStatus}
              onChange={(event) => setSettlementStatus(event.target.value as PartnerSettlementStatus | "")}
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
            >
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SETTLED">SETTLED</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </div>
        </div>
        <DataState
          isLoading={settlementsQuery.isLoading}
          isError={settlementsQuery.isError}
          isEmpty={(settlementsQuery.data?.items?.length ?? 0) === 0}
          loadingText="Loading settlements..."
          errorText="Failed to load settlements"
          emptyText="No settlements found"
          onRetry={() => void settlementsQuery.refetch()}
        >
          <div className="space-y-2">
            {(settlementsQuery.data?.items ?? []).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border)] p-2 text-xs">
                <div>
                  <p className="font-medium">Payout #{item.id} | Partner {item.providerId}</p>
                  <p className="text-[var(--color-muted)]">Amount INR {item.amount} | Booking {item.referenceBookingId || "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{item.status}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettlementStatusMutation.mutate(
                        { payoutId: item.id, status: "SETTLED", remarks: "Transferred via admin panel" },
                        {
                          onSuccess: () => toast.success("Settlement updated"),
                          onError: (error) => toast.error(extractApiError(error, "Settlement update failed")),
                        },
                      )
                    }
                    className="rounded border border-[var(--color-border)] px-2 py-1"
                  >
                    Mark Settled
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </section>

      <ModalFormLayout
        open={Boolean(activeAction && isReasonModal)}
        onClose={() => {
          setReason("");
          setActionState({ type: "none" });
        }}
        title={activeAction?.type === "reject" ? "Reject Partner" : "Block Partner"}
        formId="partner-reason-form"
        submitLabel={activeAction?.type === "reject" ? "Reject" : "Block"}
        isSubmitting={rejectPartnerMutation.isPending || blockPartnerMutation.isPending}
      >
        <form
          id="partner-reason-form"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleActionConfirm();
          }}
        >
          <p className="text-sm text-[var(--color-muted)]">
            Provide a reason for {activeAction?.type === "reject" ? "rejection" : "blocking"} {activeAction?.partner.name}.
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            required
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            placeholder="Enter reason"
          />
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(activeAction && !isReasonModal)}
        title={activeAction?.type ? `${activeAction.type[0].toUpperCase()}${activeAction.type.slice(1)} Partner` : "Confirm Action"}
        description={
          activeAction
            ? `${activeAction.type.toUpperCase()} action for ${activeAction.partner.name} (${activeAction.partner.id}).`
            : ""
        }
        confirmLabel="Confirm"
        onClose={() => setActionState({ type: "none" })}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
}


