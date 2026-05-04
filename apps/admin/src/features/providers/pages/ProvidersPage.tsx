import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { ProviderStatusBadge, ProvidersFiltersBar, ProvidersStatsCards } from "../components";
import { useProviderMutations, useProvidersQuery, useProviderStatsQuery } from "../hooks/useProviders";
import type { ProviderListItem, ProviderServiceType, ProviderStatus } from "../types";

type ActionModalState =
  | { type: "none" }
  | { type: "approve"; provider: ProviderListItem }
  | { type: "reject"; provider: ProviderListItem }
  | { type: "block"; provider: ProviderListItem }
  | { type: "unblock"; provider: ProviderListItem }
  | { type: "delete"; provider: ProviderListItem };

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

export default function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [actionState, setActionState] = useState<ActionModalState>({ type: "none" });
  const [reason, setReason] = useState("");

  const page = parsePage(searchParams.get("page"));
  const status = (searchParams.get("status") ?? "") as ProviderStatus | "";
  const serviceType = (searchParams.get("serviceType") ?? "") as ProviderServiceType;
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

  const providersQuery = useProvidersQuery({
    page,
    size: 10,
    status,
    serviceType,
    city: city || undefined,
    search: search || undefined,
    sortBy,
    sortDir: "desc",
  });
  const statsQuery = useProviderStatsQuery();
  const {
    approveProviderMutation,
    rejectProviderMutation,
    blockProviderMutation,
    unblockProviderMutation,
    deleteProviderMutation,
  } = useProviderMutations();

  const rows = providersQuery.data?.content ?? [];
  const total = providersQuery.data?.totalElements ?? 0;
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

    const providerId = activeAction.provider.id;
    if (activeAction.type === "approve") {
      approveProviderMutation.mutate(providerId, {
        onSuccess: () => {
          toast.success("Provider approved");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to approve provider")),
      });
      return;
    }

    if (activeAction.type === "unblock") {
      unblockProviderMutation.mutate(providerId, {
        onSuccess: () => {
          toast.success("Provider unblocked");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to unblock provider")),
      });
      return;
    }

    if (activeAction.type === "delete") {
      deleteProviderMutation.mutate(providerId, {
        onSuccess: () => {
          toast.success("Provider deleted");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to delete provider")),
      });
      return;
    }

    if (activeAction.type === "reject") {
      rejectProviderMutation.mutate(
        { id: providerId, reason },
        {
          onSuccess: () => {
            toast.success("Provider rejected");
            setReason("");
            setActionState({ type: "none" });
          },
          onError: (error) => toast.error(extractApiError(error, "Failed to reject provider")),
        },
      );
      return;
    }

    blockProviderMutation.mutate(
      { id: providerId, reason },
      {
        onSuccess: () => {
          toast.success("Provider blocked");
          setReason("");
          setActionState({ type: "none" });
        },
        onError: (error) => toast.error(extractApiError(error, "Failed to block provider")),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Provider Onboarding Management</h2>
        <p className="text-sm text-[var(--color-muted)]">Review, approve, reject and manage provider onboarding</p>
      </div>

      <ProvidersStatsCards stats={stats} />

      <ProvidersFiltersBar
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
        isLoading={providersQuery.isLoading}
        isError={providersQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading providers..."
        errorText="Failed to load providers"
        emptyText="No providers found"
        onRetry={() => {
          void providersQuery.refetch();
          void statsQuery.refetch();
        }}
      >
        <DataTable
          rows={rows}
          rowKey={(item) => item.id}
          columns={[
            { key: "id", header: "Provider ID", render: (item) => item.id },
            { key: "name", header: "Name", render: (item) => item.name },
            { key: "phone", header: "Phone", render: (item) => item.phone },
            { key: "serviceType", header: "Service", render: (item) => item.serviceType || "N/A" },
            { key: "city", header: "City", render: (item) => item.city || "N/A" },
            { key: "appliedDate", header: "Applied", render: (item) => item.appliedDate || "-" },
            { key: "status", header: "Status", render: (item) => <ProviderStatusBadge status={item.status} /> },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" to={`/providers/${item.id}`}>
                    View
                  </Link>
                  <button type="button" onClick={() => setActionState({ type: "approve", provider: item })} className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300">
                    Approve
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "reject", provider: item })} className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300">
                    Reject
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "block", provider: item })} className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300">
                    Block
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "unblock", provider: item })} className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300">
                    Unblock
                  </button>
                  <button type="button" onClick={() => setActionState({ type: "delete", provider: item })} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
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

      <ModalFormLayout
        open={Boolean(activeAction && isReasonModal)}
        onClose={() => {
          setReason("");
          setActionState({ type: "none" });
        }}
        title={activeAction?.type === "reject" ? "Reject Provider" : "Block Provider"}
        formId="provider-reason-form"
        submitLabel={activeAction?.type === "reject" ? "Reject" : "Block"}
        isSubmitting={rejectProviderMutation.isPending || blockProviderMutation.isPending}
      >
        <form
          id="provider-reason-form"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleActionConfirm();
          }}
        >
          <p className="text-sm text-[var(--color-muted)]">
            Provide a reason for {activeAction?.type === "reject" ? "rejection" : "blocking"} {activeAction?.provider.name}.
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
        title={activeAction?.type ? `${activeAction.type[0].toUpperCase()}${activeAction.type.slice(1)} Provider` : "Confirm Action"}
        description={
          activeAction
            ? `${activeAction.type.toUpperCase()} action for ${activeAction.provider.name} (${activeAction.provider.id}).`
            : ""
        }
        confirmLabel="Confirm"
        onClose={() => setActionState({ type: "none" })}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
}
