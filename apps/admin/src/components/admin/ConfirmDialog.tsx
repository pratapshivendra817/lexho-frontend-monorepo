import { ConfirmDialog as SharedConfirmDialog } from "@lexho/ui";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <SharedConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onClose}
      panelClassName="border border-[var(--color-border)] bg-[var(--color-surface)]"
      titleClassName="text-[var(--color-text)]"
      descriptionClassName="text-[var(--color-muted)]"
      cancelButtonClassName="border border-[var(--color-border)] text-[var(--color-text)]"
      confirmButtonClassName="bg-red-500 text-white"
    />
  );
}
