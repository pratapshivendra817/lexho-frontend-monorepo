import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { DataTable, Modal, SegmentedTabs } from "@/components/admin";
import {
  getCustomerDeleteRequestsAdmin,
  getCustomerProfilesAdmin,
  resolveCustomerDeleteRequestAdmin,
  updateCustomerProfileAdmin,
  updateCustomerStatusAdmin,
} from "../api/customerProfileControlApi";
import { customerProfileEditSchema } from "../schema";
import type { CustomerDeleteRequestItem, CustomerProfileAdmin, CustomerProfileUpdatePayload } from "../types";
import UsersPage from "../../users/pages/UsersPage";

type CustomerProfileMode = "customer-profiles" | "users";

export default function CustomerProfilesControlPage() {
  const [mode, setMode] = useState<CustomerProfileMode>("customer-profiles");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerProfileAdmin | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer-profile-control", search],
    queryFn: () => getCustomerProfilesAdmin(search),
    retry: false,
  });

  const deleteReqQuery = useQuery({
    queryKey: ["customer-delete-requests"],
    queryFn: getCustomerDeleteRequestsAdmin,
    retry: false,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const { register, handleSubmit, formState, reset } = useForm<CustomerProfileUpdatePayload>({
    resolver: zodResolver(customerProfileEditSchema),
    defaultValues: {
      profileEditLocked: false,
      emailVerified: false,
      phoneVerified: false,
      profileImageApproved: true,
      adminNotes: "",
    },
  });

  const closeModal = () => {
    setEditing(null);
    reset();
  };

  const editMutation = useMutation({
    mutationFn: async (payload: { id: string; values: CustomerProfileUpdatePayload }) =>
      updateCustomerProfileAdmin(payload.id, payload.values),
    onSuccess: async () => {
      toast.success("Customer governance updated");
      await queryClient.invalidateQueries({ queryKey: ["customer-profile-control"] });
      closeModal();
    },
    onError: () => toast.error("Failed to update governance"),
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string; active: boolean }) => updateCustomerStatusAdmin(payload.id, payload.active),
    onSuccess: async () => {
      toast.success("Customer status updated");
      await queryClient.invalidateQueries({ queryKey: ["customer-profile-control"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const resolveDeleteMutation = useMutation({
    mutationFn: async (payload: { requestId: string; approve: boolean; reason: string }) =>
      resolveCustomerDeleteRequestAdmin(payload.requestId, payload.approve, payload.reason),
    onSuccess: async (_, vars) => {
      toast.success(vars.approve ? "Delete request approved" : "Delete request rejected");
      await queryClient.invalidateQueries({ queryKey: ["customer-delete-requests"] });
    },
    onError: () => toast.error("Failed to resolve delete request"),
  });

  const openEdit = (row: CustomerProfileAdmin) => {
    setEditing(row);
    reset({
      profileEditLocked: row.profileEditLocked,
      emailVerified: row.emailVerified,
      phoneVerified: row.phoneVerified,
      profileImageApproved: row.profileImageApproved,
      adminNotes: row.adminNotes || "",
    });
  };

  const onSubmit = handleSubmit((values) => {
    if (!editing) return;
    editMutation.mutate({ id: editing.id, values });
  });

  const pendingDeleteRequests = deleteReqQuery.data ?? [];

  const resolveDelete = (request: CustomerDeleteRequestItem, approve: boolean) => {
    const reason = approve ? "Verified request" : "Rejected by admin";
    resolveDeleteMutation.mutate({ requestId: request.id, approve, reason });
  };

  if (mode === "users") {
    return (
      <div className="space-y-4">
        <SegmentedTabs items={customerProfileModeTabs} value={mode} onChange={setMode} />
        <UsersPage />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SegmentedTabs items={customerProfileModeTabs} value={mode} onChange={setMode} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Customer Profile Governance</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage profile locks, verification flags and account lifecycle.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, email"
          className="w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none"
        />
      </div>

      {isLoading ? <div className="text-sm text-[var(--color-muted)]">Loading customer profiles...</div> : null}
      {isError ? (
        <div className="space-y-2 text-sm">
          <p className="text-red-400">Failed to load customer profiles.</p>
          <button type="button" onClick={() => void refetch()} className="rounded-lg bg-red-600 px-3 py-1 text-white">Retry</button>
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <DataTable
          columns={[
            { key: "name", header: "Customer", render: (row) => row.fullName || "-" },
            { key: "contact", header: "Contact", render: (row) => <div><p>{row.phoneNumber || row.mobile || "-"}</p><p className="text-xs text-[var(--color-muted)]">{row.email || "-"}</p></div> },
            { key: "flags", header: "Flags", render: (row) => <div className="text-xs"><p>Email: {row.emailVerified ? "Verified" : "Pending"}</p><p>Phone: {row.phoneVerified ? "Verified" : "Pending"}</p><p>Edit: {row.profileEditLocked ? "Locked" : "Open"}</p></div> },
            { key: "active", header: "Status", render: (row) => (row.active ? <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Active</span> : <span className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Inactive</span>) },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={() => openEdit(row)}>Governance</button>
                  <button
                    type="button"
                    className="rounded bg-amber-600 px-2 py-1 text-xs text-white"
                    onClick={() => statusMutation.mutate({ id: row.id, active: !row.active })}
                  >
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />
      ) : null}

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 text-base font-semibold">Account Delete Requests</h3>
        {deleteReqQuery.isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading requests...</p> : null}
        {pendingDeleteRequests.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No pending requests.</p> : null}
        <div className="space-y-2">
          {pendingDeleteRequests.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--color-border)] px-3 py-2">
              <div>
                <p className="text-sm font-medium">{row.customerName || row.customerId}</p>
                <p className="text-xs text-[var(--color-muted)]">{row.reason || "Delete requested"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => resolveDelete(row, true)}>Approve</button>
                <button type="button" className="rounded bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => resolveDelete(row, false)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal open={Boolean(editing)} onClose={closeModal} title="Customer Governance Update">
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("profileEditLocked")} /> Profile Edit Locked</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("emailVerified")} /> Email Verified</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("phoneVerified")} /> Phone Verified</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("profileImageApproved")} /> Profile Image Approved</label>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Admin Notes</label>
            <textarea {...register("adminNotes")} rows={3} className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-red-400">{formState.errors.adminNotes?.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={editMutation.isPending} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">{editMutation.isPending ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const customerProfileModeTabs: Array<{ label: string; value: CustomerProfileMode }> = [
  { label: "Customer Profiles", value: "customer-profiles" },
  { label: "Users", value: "users" },
];
