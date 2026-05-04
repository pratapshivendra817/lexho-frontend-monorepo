import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { ProviderStatusBadge } from "../components";
import { downloadProviderDocument } from "../api/providersApi";
import { useProviderDetailsQuery } from "../hooks/useProviders";

export default function ProviderDetailsPage() {
  const { id } = useParams();
  const detailsQuery = useProviderDetailsQuery(id);

  const provider = detailsQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Provider Details</h2>
          <p className="text-sm text-[var(--color-muted)]">Review profile, documents and status history</p>
        </div>
        <Link to="/providers" className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm">
          Back
        </Link>
      </div>

      <DataState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        isEmpty={!provider}
        loadingText="Loading provider details..."
        errorText="Unable to load provider details"
        emptyText="Provider not found"
        onRetry={() => {
          void detailsQuery.refetch();
        }}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 xl:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Profile</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Provider ID" value={provider?.id} />
              <InfoRow label="Name" value={provider?.name} />
              <InfoRow label="Email" value={provider?.email} />
              <InfoRow label="Phone" value={provider?.phone} />
              <InfoRow label="Gender" value={provider?.gender} />
              <InfoRow label="DOB" value={provider?.dob} />
              <InfoRow label="City" value={provider?.city} />
              <InfoRow label="State" value={provider?.state} />
              <InfoRow label="Address" value={provider?.address} full />
              <InfoRow label="Service Type" value={provider?.serviceType} />
              <InfoRow label="Experience" value={provider?.experience} />
              <InfoRow label="Availability Type" value={provider?.availabilityType} />
              <InfoRow label="Service Areas" value={provider?.serviceAreas?.join(", ")} full />
              <InfoRow label="Working Days" value={provider?.workingDays?.join(", ")} full />
              <InfoRow label="Work Time" value={`${provider?.startTime ?? "-"} to ${provider?.endTime ?? "-"}`} />
              <InfoRow label="Bank A/C" value={provider?.accountNumber} />
              <InfoRow label="IFSC" value={provider?.ifscCode} />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Status</h3>
            {provider ? <ProviderStatusBadge status={provider.status} /> : null}

            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Status History</h4>
            <div className="mt-3 grid gap-2">
              {provider?.statusHistory.length ? (
                provider.statusHistory.map((item, index) => (
                  <div key={`${item.status}-${item.changedAt ?? index}`} className="rounded-lg border border-[var(--color-border)] p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <ProviderStatusBadge status={item.status} />
                      <span className="text-[var(--color-muted)]">{item.changedAt ?? "-"}</span>
                    </div>
                    {item.reason ? <p className="mt-2 text-[var(--color-text)]">{item.reason}</p> : null}
                    {item.changedBy ? <p className="mt-1 text-[var(--color-muted)]">By: {item.changedBy}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted)]">No status history available.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Documents</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {provider?.documents.length ? (
              provider.documents.map((document) => {
                const isImage = document.contentType.includes("image");
                const isPdf = document.contentType.includes("pdf");

                return (
                  <div key={document.id} className="rounded-lg border border-[var(--color-border)] p-3">
                    <p className="text-sm font-medium text-[var(--color-text)]">{document.name || document.documentType}</p>
                    <p className="text-xs text-[var(--color-muted)]">{document.documentType}</p>

                    <div className="mt-3 overflow-hidden rounded-md border border-[var(--color-border)]">
                      {document.previewUrl && isImage ? (
                        <img src={document.previewUrl} alt={document.name} className="h-40 w-full object-cover" />
                      ) : document.previewUrl && isPdf ? (
                        <iframe title={document.name} src={document.previewUrl} className="h-40 w-full" />
                      ) : (
                        <div className="grid h-40 place-items-center text-xs text-[var(--color-muted)]">Preview unavailable</div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mt-3 w-full rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
                      onClick={() => {
                        if (!provider) return;
                        downloadProviderDocument(provider.id, document.id).catch((error) => {
                          toast.error(extractApiError(error, "Unable to download document"));
                        });
                      }}
                    >
                      Download
                    </button>
                  </div>
                );
              })
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
