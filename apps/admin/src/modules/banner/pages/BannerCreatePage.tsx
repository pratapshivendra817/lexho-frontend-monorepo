import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";
import { BannerForm, defaultBannerFormValues } from "../components/BannerForm";
import { useBannerCategories, useCreateBanner } from "../hooks/useBanners";
import type { BannerFormValues } from "../types/banner.types";

export default function BannerCreatePage() {
  const navigate = useNavigate();
  const categoriesQuery = useBannerCategories();
  const createMutation = useCreateBanner();

  const handleSubmit = (values: BannerFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Banner created");
        navigate("/banner-management");
      },
      onError: (error) => {
        toast.error(extractApiError(error, "Unable to create banner"));
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Banner</h2>
          <p className="text-sm text-[var(--color-muted)]">Create new campaign banner</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <DataState
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          isEmpty={false}
          loadingText="Loading banner form data..."
          errorText="Unable to load categories"
          emptyText=""
          onRetry={() => {
            void categoriesQuery.refetch();
          }}
        >
          <BannerForm
            defaultValues={defaultBannerFormValues}
            categories={categoriesQuery.data ?? []}
            isSubmitting={createMutation.isPending}
            onSubmit={handleSubmit}
          />
        </DataState>
      </div>
    </div>
  );
}
