import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";
import { BannerForm, defaultBannerFormValues } from "../components/BannerForm";
import {
  useBannerById,
  useBannerCategories,
  useBannerServices,
  useUpdateBanner,
} from "../hooks/useBanners";
import type { BannerFormValues } from "../types/banner.types";

export default function BannerEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const bannerQuery = useBannerById(id);
  const categoriesQuery = useBannerCategories();
  const servicesQuery = useBannerServices();
  const updateMutation = useUpdateBanner();

  const formDefaults = useMemo<BannerFormValues>(() => {
    const banner = bannerQuery.data;
    if (!banner) return defaultBannerFormValues;
    return {
      title: banner.title,
      categoryId: banner.categoryId ?? "",
      imageUrl: banner.imageUrl,
      redirectType: banner.redirectType,
      redirectValue: banner.redirectValue,
      priority: banner.priority,
      active: banner.active,
    };
  }, [bannerQuery.data]);

  const handleSubmit = (values: BannerFormValues) => {
    if (!id) return;
    updateMutation.mutate(
      { id, payload: values },
      {
        onSuccess: () => {
          toast.success("Banner updated");
          navigate("/banner-management");
        },
        onError: (error) => {
          toast.error(extractApiError(error, "Unable to update banner"));
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Edit Banner</h2>
          <p className="text-sm text-[var(--color-muted)]">Update banner details</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <DataState
          isLoading={bannerQuery.isLoading || categoriesQuery.isLoading || servicesQuery.isLoading}
          isError={bannerQuery.isError || categoriesQuery.isError || servicesQuery.isError}
          isEmpty={!bannerQuery.data}
          loadingText="Loading banner..."
          errorText="Unable to load banner form data"
          emptyText="Banner not found"
          onRetry={() => {
            void Promise.all([bannerQuery.refetch(), categoriesQuery.refetch(), servicesQuery.refetch()]);
          }}
        >
          <BannerForm
            defaultValues={formDefaults}
            categories={categoriesQuery.data ?? []}
            services={servicesQuery.data ?? []}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleSubmit}
          />
        </DataState>
      </div>
    </div>
  );
}
