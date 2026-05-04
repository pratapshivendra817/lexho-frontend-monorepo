import type { ReactNode } from "react";

import { Modal } from "./Modal";

type ModalFormLayoutProps = {
  open: boolean;
  title: string;
  formId: string;
  submitLabel: string;
  isSubmitting?: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function ModalFormLayout({
  open,
  title,
  formId,
  submitLabel,
  isSubmitting = false,
  onClose,
  children,
  maxWidthClassName,
}: ModalFormLayoutProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      maxWidthClassName={maxWidthClassName}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
            {submitLabel}
          </button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
