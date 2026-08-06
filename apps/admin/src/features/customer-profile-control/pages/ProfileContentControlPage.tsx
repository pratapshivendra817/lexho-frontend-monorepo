import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { SegmentedTabs } from "@/components/admin";
import { getProfileContentAdmin, updateProfileContentAdmin } from "../api/customerProfileControlApi";
import { profileContentSchema } from "../schema";
import type { CustomerProfileContent } from "../types";
import SectionsPage from "../../sections/pages/SectionsPage";

type ContentMode = "profile-content" | "sections";

export default function ProfileContentControlPage() {
  const [mode, setMode] = useState<ContentMode>("profile-content");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["profile-content-control"],
    queryFn: getProfileContentAdmin,
    retry: false,
  });

  const { register, handleSubmit, formState, reset } = useForm<CustomerProfileContent>({
    resolver: zodResolver(profileContentSchema),
    defaultValues: { aboutUs: "", termsOfService: "", privacyPolicy: "" },
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: updateProfileContentAdmin,
    onSuccess: () => toast.success("Profile content updated"),
    onError: () => toast.error("Unable to save content"),
  });

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  if (mode === "sections") {
    return (
      <div className="space-y-4">
        <SegmentedTabs items={contentModeTabs} value={mode} onChange={setMode} />
        <SectionsPage />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SegmentedTabs items={contentModeTabs} value={mode} onChange={setMode} />

      <div>
        <h2 className="text-xl font-semibold">Profile Content Manager</h2>
        <p className="text-sm text-[var(--color-muted)]">Manage About Us, Terms of Service and Privacy Policy shown in customer app profile.</p>
      </div>

      {isLoading ? <div className="text-sm text-[var(--color-muted)]">Loading content...</div> : null}
      {isError ? (
        <div className="space-y-2 text-sm">
          <p className="text-red-400">Failed to load profile content.</p>
          <button type="button" onClick={() => void refetch()} className="rounded-lg bg-red-600 px-3 py-1 text-white">Retry</button>
        </div>
      ) : null}

      <form className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4" onSubmit={(event) => void onSubmit(event)}>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">About Us</label>
          <textarea {...register("aboutUs")} rows={6} className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-red-400">{formState.errors.aboutUs?.message}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Terms of Service</label>
          <textarea {...register("termsOfService")} rows={8} className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-red-400">{formState.errors.termsOfService?.message}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Privacy Policy</label>
          <textarea {...register("privacyPolicy")} rows={8} className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-red-400">{formState.errors.privacyPolicy?.message}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => reset(data)} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm">Reset</button>
          <button type="submit" disabled={saveMutation.isPending} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">{saveMutation.isPending ? "Saving..." : "Save Content"}</button>
        </div>
      </form>
    </div>
  );
}

const contentModeTabs: Array<{ label: string; value: ContentMode }> = [
  { label: "Profile Content", value: "profile-content" },
  { label: "Sections", value: "sections" },
];
