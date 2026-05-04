import { useEffect, useState } from "react";

import { Modal } from "@/components/admin";

import type { CategoryOption, ServiceItem } from "../types";
import { PrimaryButton } from "./PrimaryButton";

type PopularServiceModalProps = {
  open: boolean;
  categories: CategoryOption[];
  service: ServiceItem | null;
  defaultCategoryId: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: { categoryId: string; priority: number }) => void;
};

export function PopularServiceModal({
  open,
  categories,
  service,
  defaultCategoryId,
  isSubmitting,
  onClose,
  onSubmit,
}: PopularServiceModalProps) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [priority, setPriority] = useState(1);

  useEffect(() => {
    if (!open) return;
    setCategoryId(defaultCategoryId);
    setPriority(1);
  }, [defaultCategoryId, open, service?.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? `Make Popular: ${service.name}` : "Make Popular"}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <PrimaryButton tone="neutral" onClick={onClose}>
            Cancel
          </PrimaryButton>
          <PrimaryButton
            disabled={isSubmitting}
            onClick={() => onSubmit({ categoryId, priority })}
          >
            {isSubmitting ? "Saving..." : "Add Popular"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm text-[var(--color-text)]">
          <span>Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm text-[var(--color-text)]">
          <span>Priority</span>
          <input
            type="number"
            min={1}
            value={priority}
            onChange={(event) => {
              const value = Number(event.target.value);
              setPriority(Number.isFinite(value) && value > 0 ? value : 1);
            }}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
        </label>
      </div>
    </Modal>
  );
}
