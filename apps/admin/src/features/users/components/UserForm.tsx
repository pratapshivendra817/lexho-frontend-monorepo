import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { userFormSchema, type UserFormValues } from "../schema";

type UserFormProps = {
  formId?: string;
  initialValues?: UserFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  hideSubmitButton?: boolean;
  onSubmit: (values: UserFormValues) => void;
};

const defaultValues: UserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: "CUSTOMER",
  city: "",
  status: "ACTIVE",
};

export function UserForm({
  formId,
  initialValues,
  submitLabel,
  isSubmitting,
  hideSubmitButton = false,
  onSubmit,
}: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  useEffect(() => {
    form.reset(initialValues ?? defaultValues);
  }, [form, initialValues]);

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Name</span>
          <input
            {...form.register("name")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          />
          {form.formState.errors.name ? (
            <span className="text-xs text-red-300">{form.formState.errors.name.message}</span>
          ) : null}
        </label>

        <label className="grid gap-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            {...form.register("email")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          />
          {form.formState.errors.email ? (
            <span className="text-xs text-red-300">{form.formState.errors.email.message}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Phone</span>
          <input
            {...form.register("phone")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          />
          {form.formState.errors.phone ? (
            <span className="text-xs text-red-300">{form.formState.errors.phone.message}</span>
          ) : null}
        </label>

        <label className="grid gap-1 text-sm">
          <span>City</span>
          <input
            {...form.register("city")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          />
          {form.formState.errors.city ? (
            <span className="text-xs text-red-300">{form.formState.errors.city.message}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Role</span>
          <select
            {...form.register("role")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          >
            <option value="CUSTOMER">Customer</option>
            <option value="PROVIDER">Provider</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span>Status</span>
          <select
            {...form.register("status")}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
          >
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      {hideSubmitButton ? null : (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

