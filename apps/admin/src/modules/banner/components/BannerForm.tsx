import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ImageUrlInput } from "@/components/admin";
import type {
  BannerCategoryOption,
  BannerFormValues,
  BannerRedirectType,
} from "../types/banner.types";

const schema = z
  .object({
    title: z.string().min(2, "Title is required"),
    categoryId: z.string(),
    imageUrl: z.string().url("Image is required"),
    redirectType: z.enum(["CATEGORY", "SERVICE", "EXTERNAL"]),
    redirectValue: z.string().min(1, "Redirect target is required"),
    priority: z.number().int().min(0, "Priority must be 0 or greater"),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.redirectType === "EXTERNAL") {
      try {
        new URL(values.redirectValue);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid URL for external redirect",
          path: ["redirectValue"],
        });
      }
    }
  });

type BannerFormProps = {
  defaultValues: BannerFormValues;
  categories: BannerCategoryOption[];
  isSubmitting: boolean;
  onSubmit: (values: BannerFormValues) => void;
};

export function BannerForm({
  defaultValues,
  categories,
  isSubmitting,
  onSubmit,
}: BannerFormProps) {
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);
  useEffect(() => {
    if (form.getValues("redirectType") === "SERVICE") {
      form.setValue("redirectType", "CATEGORY", { shouldDirty: true });
      if (!form.getValues("redirectValue")) {
        form.setValue("redirectValue", "", { shouldDirty: true });
      }
    }
  }, [form]);

  const redirectType = form.watch("redirectType");
  const submitForm = form.handleSubmit((values: BannerFormValues) => onSubmit(values));
  const redirectLabel = useMemo(() => {
    if (redirectType === "CATEGORY") return "Redirect Category ID";
    return "Redirect URL";
  }, [redirectType]);

  return (
    <form
      id="new-banner-form"
      className="grid gap-4"
      onSubmit={submitForm}
    >
      <label className="grid gap-1 text-sm text-[var(--color-text)]">
        <span>Title</span>
        <input
          {...form.register("title")}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
        {form.formState.errors.title ? (
          <span className="text-xs text-red-300">{form.formState.errors.title.message}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm text-[var(--color-text)]">
        <span>Category</span>
        <select
          {...form.register("categoryId")}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Global Banner</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <ImageUrlInput
        value={form.watch("imageUrl")}
        onChange={(value) => form.setValue("imageUrl", value, { shouldValidate: true })}
        label="Banner Image"
      />
      {form.formState.errors.imageUrl ? (
        <span className="text-xs text-red-300">{form.formState.errors.imageUrl.message}</span>
      ) : null}

      <label className="grid gap-1 text-sm text-[var(--color-text)]">
        <span>Redirect Type</span>
        <select
          {...form.register("redirectType")}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="CATEGORY">CATEGORY</option>
          <option value="EXTERNAL">EXTERNAL</option>
        </select>
      </label>

      {redirectType === "CATEGORY" ? (
        <label className="grid gap-1 text-sm text-[var(--color-text)]">
          <span>Redirect Category</span>
          <select
            {...form.register("redirectValue")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {form.formState.errors.redirectValue ? (
            <span className="text-xs text-red-300">{form.formState.errors.redirectValue.message}</span>
          ) : null}
        </label>
      ) : null}

      {redirectType === "EXTERNAL" ? (
        <label className="grid gap-1 text-sm text-[var(--color-text)]">
          <span>{redirectLabel}</span>
          <input
            {...form.register("redirectValue")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          {form.formState.errors.redirectValue ? (
            <span className="text-xs text-red-300">{form.formState.errors.redirectValue.message}</span>
          ) : null}
        </label>
      ) : null}

      <label className="grid gap-1 text-sm text-[var(--color-text)]">
        <span>Priority</span>
        <input
          type="number"
          {...form.register("priority", {
            setValueAs: (value) => {
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : 0;
            },
          })}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
        {form.formState.errors.priority ? (
          <span className="text-xs text-red-300">{form.formState.errors.priority.message}</span>
        ) : null}
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" {...form.register("active")} />
        Active
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save Banner"}
        </button>
      </div>
    </form>
  );
}

export const defaultBannerFormValues: BannerFormValues = {
  title: "",
  categoryId: "",
  imageUrl: "",
  redirectType: "CATEGORY" as BannerRedirectType,
  redirectValue: "",
  priority: 0,
  active: true,
};
