import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  maxWidthClassName?: string;
};

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  maxWidthClassName = "max-w-2xl",
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-[121] flex w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] ${maxWidthClassName} max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl focus:outline-none`}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
            <Dialog.Title className="text-base font-semibold text-[var(--color-text)] sm:text-lg">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>

          {footer ? (
            <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-5">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
