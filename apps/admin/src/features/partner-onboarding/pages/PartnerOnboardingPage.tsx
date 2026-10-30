import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  fetchPartnerOnboarding,
  fetchPartnerOnboardingApplications,
  reviewPartnerOnboarding,
  sendPartnerOnboardingReviewNotification,
  type PartnerOnboardingReview,
} from "../../../api/admin";
import { extractApiError } from "../../../utils/apiError";

type UnknownRecord = Record<string, unknown>;

const inputClass = "rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-[var(--color-text)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";
const statuses = ["PENDING", "APPROVED", "REJECTED", "BLOCKED"] as const;
const documentStatuses = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"] as const;
const documentFields = [["aadhaarFront", "Aadhaar front", "ID"], ["aadhaarBack", "Aadhaar back", "ID"], ["panCard", "PAN card", "PAN"], ["selfie", "Profile selfie", "IMG"], ["certificate", "Certificate", "DOC"]] as const;

export default function PartnerOnboardingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<PartnerOnboardingReview["applicationStatus"]>("PENDING");
  const [documentStatus, setDocumentStatus] = useState<PartnerOnboardingReview["documentStatus"]>("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");

  const listQuery = useQuery({
    queryKey: ["partner-onboarding-applications", page],
    queryFn: () => fetchPartnerOnboardingApplications({ page, size: 20 }),
    retry: false,
  });
  const listPage = useMemo(() => unwrapListPage(listQuery.data), [listQuery.data]);
  const applications = listPage.rows;

  useEffect(() => {
    if (!selectedId && applications.length > 0) {
      setSelectedId(partnerIdOf(applications[0]));
    }
  }, [applications, selectedId]);

  const detailQuery = useQuery({
    queryKey: ["partner-onboarding", selectedId],
    queryFn: () => fetchPartnerOnboarding(selectedId),
    enabled: Boolean(selectedId),
    retry: false,
  });
  const record = useMemo(() => unwrap(detailQuery.data), [detailQuery.data]);

  useEffect(() => {
    if (!record) return;
    setApplicationStatus(asStatus(record.applicationStatus ?? record.status, "PENDING") as PartnerOnboardingReview["applicationStatus"]);
    setDocumentStatus(asDocumentStatus(record.documentStatus, "PENDING"));
    setRejectionReason(String(record.rejectionReason ?? ""));
  }, [record]);

  const reviewPayload = useMemo(() => ({
    applicationStatus,
    documentStatus,
    rejectionReason: rejectionReason.trim() || null,
  }), [applicationStatus, documentStatus, rejectionReason]);

  const review = useMutation({
    mutationFn: async () => {
      const saved = await reviewPartnerOnboarding(selectedId, reviewPayload);
      let notified = false;
      try {
        const notification = buildOnboardingNotification(reviewPayload);
        await sendPartnerOnboardingReviewNotification({
          partnerId: selectedId,
          ...reviewPayload,
          ...notification,
        });
        notified = true;
      } catch (error) {
        toast.error(extractApiError(error, "Review saved, but partner notification could not be sent"));
      }
      return { saved, notified };
    },
    onSuccess: (result) => {
      toast.success(result.notified ? "Review saved and partner notified" : "Review saved");
      void detailQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["partner-onboarding-applications"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to save review")),
  });

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-blue-400">Partner operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-text)]">Partner onboarding</h1><p className="mt-2 text-sm text-[var(--color-muted)]">Review partner applications from the list and take action from the detail panel.</p></div>
      <button type="button" onClick={() => void listQuery.refetch()} className="rounded-xl border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-400/10">Refresh list</button>
    </header>

    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm xl:sticky xl:top-5">
        <div className="border-b border-[var(--color-border)] p-4">
          <SectionTitle title="Applications" subtitle={`${listPage.totalElements} partners found`} />
        </div>
        {listQuery.isLoading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-[var(--color-background)]" />)}</div> : null}
        {listQuery.isError ? <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{extractApiError(listQuery.error, "Unable to load partner applications")}</div> : null}
        {!listQuery.isLoading && !listQuery.isError && applications.length === 0 ? <div className="p-8 text-center text-sm text-[var(--color-muted)]">No onboarding applications found.</div> : null}
        <div className="divide-y divide-[var(--color-border)]">
          {applications.map((application) => {
            const partnerId = partnerIdOf(application);
            const selected = partnerId === selectedId;
            return <button key={partnerId} type="button" onClick={() => setSelectedId(partnerId)} className={`w-full px-4 py-3 text-left transition ${selected ? "bg-blue-500/10" : "hover:bg-[var(--color-background)]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text)]">{partnerName(application)}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Partner #{partnerId}</p>
                </div>
                <Badge value={String(application.applicationStatus ?? application.status ?? "PENDING")} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                <span>{String(application.documentStatus ?? "PENDING").replaceAll("_", " ")}</span>
                <span>Submitted {formatDate(application.submittedAt ?? application.createdAt)}</span>
              </div>
            </button>;
          })}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] p-3 text-sm">
          <button type="button" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span className="text-[var(--color-muted)]">Page {page + 1}</span>
          <button type="button" disabled={applications.length < 20 || page + 1 >= listPage.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </section>

      <section className="min-w-0">
        {detailQuery.isLoading ? <Loading /> : null}
        {detailQuery.isError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{extractApiError(detailQuery.error, "Unable to load onboarding application")}</div> : null}
        {record ? <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Application</p><h2 className="mt-1 text-2xl font-bold">{partnerName(record)}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Partner #{partnerIdOf(record)} submitted {formatDate(record.submittedAt ?? record.createdAt)}</p></div><Badge value={String(record.applicationStatus ?? record.status ?? "PENDING")} /></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Application" value={String(record.applicationStatus ?? record.status ?? "PENDING")} /><Metric label="Documents" value={String(record.documentStatus ?? "PENDING")} /><Metric label="Last reviewed" value={formatDate(record.reviewedAt ?? record.updatedAt)} /></div>
            </section>
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><SectionTitle title="Partner profile" subtitle="Information submitted by the partner" /><div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{profileEntries(record).map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section>
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><SectionTitle title="Verification documents" subtitle="Open each document to verify authenticity" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{documentFields.map(([key, label, icon]) => <DocumentCardWithActions key={key} label={label} icon={icon} value={documentValue(record, key)} />)}</div></section>
          </main>
          <aside className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm 2xl:sticky 2xl:top-5">
            <SectionTitle title="Review application" subtitle="Update the decision and notify the partner" />
            <label className="mt-5 grid gap-2 text-sm font-medium">Application status<select className={inputClass} value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value as PartnerOnboardingReview["applicationStatus"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="mt-4 grid gap-2 text-sm font-medium">Document status<select className={inputClass} value={documentStatus} onChange={(event) => setDocumentStatus(event.target.value as PartnerOnboardingReview["documentStatus"])}>{documentStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="mt-4 grid gap-2 text-sm font-medium">Review note<textarea className={`${inputClass} min-h-28 resize-y`} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Add a note or rejection reason" /></label>
            <button type="button" onClick={() => review.mutate()} disabled={review.isPending || !selectedId} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50">{review.isPending ? "Saving review..." : "Save review decision"}</button>
          </aside>
        </div> : !detailQuery.isLoading ? <EmptyState /> : null}
      </section>
    </div>
  </div>;
}

function unwrap(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as UnknownRecord;
  for (const key of ["data", "onboarding", "application", "partner", "item", "result"]) {
    if (root[key] && typeof root[key] === "object" && !Array.isArray(root[key])) return unwrap(root[key]);
  }
  return root;
}

function unwrapListPage(payload: unknown) {
  const root = unwrap(payload);
  const rows = pickArray(root, ["content", "items", "results", "applications", "partners"]).filter((row): row is UnknownRecord => Boolean(row && typeof row === "object" && !Array.isArray(row)));
  const totalElements = toNumber(root?.totalElements ?? root?.total ?? rows.length);
  const totalPages = toNumber(root?.totalPages ?? Math.ceil(totalElements / 20));
  return { rows, totalElements, totalPages };
}

function pickArray(source: unknown, keys: string[]) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return [];
  const record = source as UnknownRecord;
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as unknown[];
  return [];
}

function partnerIdOf(record: UnknownRecord) { return String(record.partnerId ?? record.id ?? record.providerId ?? ""); }
function partnerName(record: UnknownRecord) { return String(record.fullName ?? record.name ?? record.partnerName ?? `Partner #${partnerIdOf(record)}`); }
function profileEntries(record: UnknownRecord) { const hidden = new Set(["id", "partnerId", "providerId", "applicationStatus", "status", "documentStatus", "rejectionReason", "createdAt", "updatedAt", "submittedAt", "reviewedAt", "documents", "documentMap", "maskedAccountNumber", "serviceCategoryId", "skills", ...documentFields.flatMap(([key]) => [key, `${key}Url`])]); const serviceCategory = serviceCategoryLabel(record); const entries = Object.entries(record).filter(([key, value]) => !hidden.has(key) && value != null && typeof value !== "object").map(([key, value]) => [title(key), String(value)] as [string, string]); return [...(serviceCategory ? [["Service category", serviceCategory] as [string, string]] : []), ...entries].slice(0, 16); }
function serviceCategoryLabel(record: UnknownRecord) { if (Array.isArray(record.skills) && record.skills.length > 0) return record.skills.map((item) => String(item)).filter(Boolean).join(", "); return String(record.serviceCategory ?? record.serviceCategoryName ?? record.categoryName ?? "").trim(); }
function title(value: string) { return value.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase()); }
function asStatus(value: unknown, fallback: string) { return statuses.includes(String(value).toUpperCase() as typeof statuses[number]) ? String(value).toUpperCase() : fallback; }
function asDocumentStatus(value: unknown, fallback: PartnerOnboardingReview["documentStatus"]) { return documentStatuses.includes(String(value).toUpperCase() as typeof documentStatuses[number]) ? String(value).toUpperCase() as PartnerOnboardingReview["documentStatus"] : fallback; }
function buildOnboardingNotification(payload: PartnerOnboardingReview) {
  if (payload.applicationStatus === "APPROVED") {
    return {
      title: "Onboarding approved",
      message: "Your onboarding has been approved. You can now start using partner services.",
    };
  }
  if (payload.applicationStatus === "REJECTED") {
    return {
      title: "Onboarding rejected",
      message: payload.rejectionReason ? `Your onboarding was rejected: ${payload.rejectionReason}` : "Your onboarding was rejected. Please check and resubmit your details.",
    };
  }
  if (payload.applicationStatus === "BLOCKED") {
    return {
      title: "Onboarding blocked",
      message: payload.rejectionReason ? `Your onboarding is blocked: ${payload.rejectionReason}` : "Your onboarding is blocked. Please contact support for next steps.",
    };
  }
  if (payload.documentStatus === "REJECTED") {
    return {
      title: "Documents need correction",
      message: payload.rejectionReason ? `Please update your onboarding documents: ${payload.rejectionReason}` : "Please update your onboarding documents and submit again.",
    };
  }
  if (payload.documentStatus === "UNDER_REVIEW") {
    return {
      title: "Documents under review",
      message: "Your onboarding documents are under review. We will notify you when the review is complete.",
    };
  }
  if (payload.documentStatus === "VERIFIED") {
    return {
      title: "Documents verified",
      message: "Your onboarding documents have been verified.",
    };
  }
  return {
    title: "Onboarding status updated",
    message: "Your onboarding status has been updated. Open the app to view details.",
  };
}
function toNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function formatDate(value: unknown) { if (!value) return "-"; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
function formatLink(value: unknown, preferredKeys = ["url", "previewUrl", "downloadUrl", "fileUrl", "location"]) { if (typeof value === "string") return value; if (value && typeof value === "object") { const item = value as UnknownRecord; for (const key of preferredKeys) { const candidate = item[key]; if (typeof candidate === "string" && candidate.trim()) return candidate.trim(); } } return ""; }
function documentValue(record: UnknownRecord, key: typeof documentFields[number][0]) { const direct = record[key] ?? record[`${key}Url`]; if (direct) return direct; const documentMap = record.documentMap; if (documentMap && typeof documentMap === "object" && !Array.isArray(documentMap)) { const mapped = (documentMap as UnknownRecord)[key]; if (mapped) return mapped; } const documents = record.documents; if (Array.isArray(documents)) return documents.find((item) => item && typeof item === "object" && ((item as UnknownRecord).key === key || (item as UnknownRecord).type === key || String((item as UnknownRecord).type ?? "").toLowerCase().replaceAll("_", "") === key.toLowerCase())); return null; }
function Badge({ value }: { value: string }) { const tone = value === "APPROVED" || value === "VERIFIED" ? "bg-emerald-500/15 text-emerald-300" : value === "REJECTED" || value === "BLOCKED" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"; return <span className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>{value.replaceAll("_", " ")}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--color-background)] p-3"><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value.replaceAll("_", " ")}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>; }
function DocumentCard({ label, icon, value }: { label: string; icon: string; value: unknown }) { const href = formatLink(value); return <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3 transition hover:border-blue-400/50"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-300">{icon}</span><div className="min-w-0"><p className="font-medium">{label}</p><p className="truncate text-xs text-[var(--color-muted)]">{href ? "Document uploaded" : "Not uploaded"}</p></div></div>{href ? <a className="shrink-0 rounded-lg border border-blue-400/30 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-400/10" href={href} target="_blank" rel="noreferrer">Open</a> : <span className="text-xs text-[var(--color-muted)]">-</span>}</div>; }
function DocumentCardWithActions({ label, icon, value }: { label: string; icon: string; value: unknown }) {
  const previewUrl = formatLink(value, ["previewUrl", "url", "fileUrl", "location", "downloadUrl"]);
  const downloadUrl = formatLink(value, ["downloadUrl", "url", "fileUrl", "location", "previewUrl"]);
  const uploaded = Boolean(previewUrl || downloadUrl);
  if (!uploaded) return <DocumentCard label={label} icon={icon} value={value} />;

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--color-border)] p-3 transition hover:border-blue-400/50">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-300">{icon}</span>
      <div className="min-w-0">
        <p className="break-words font-medium leading-5">{label}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">Document uploaded</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a className="rounded-lg border border-blue-400/30 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-400/10" href={previewUrl || downloadUrl} target="_blank" rel="noreferrer">Preview</a>
          <a className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]" href={downloadUrl || previewUrl} download target="_blank" rel="noreferrer">Download</a>
        </div>
      </div>
    </div>
  );
}
function SectionTitle({ title: heading, subtitle }: { title: string; subtitle: string }) { return <div><h2 className="text-lg font-bold">{heading}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p></div>; }
function Loading() { return <div className="grid gap-4 md:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface)]" /><div className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface)]" /><div className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface)]" /></div>; }
function EmptyState() { return <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-20 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-2xl">#</div><h2 className="mt-4 text-lg font-semibold">Select a partner application</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Click a partner name from the list to view profile, documents and review actions.</p></div>; }
