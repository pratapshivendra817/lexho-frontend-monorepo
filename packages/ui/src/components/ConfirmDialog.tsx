type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
  panelClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  actionsClassName?: string
  cancelButtonClassName?: string
  confirmButtonClassName?: string
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
  panelClassName,
  titleClassName,
  descriptionClassName,
  actionsClassName,
  cancelButtonClassName,
  confirmButtonClassName
}: ConfirmDialogProps) => {
  const titleId = useId()
  const descriptionId = useId()

  if (!open) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div
        className={`w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl ${
          panelClassName ?? ''
        }`.trim()}
      >
        <h3 id={titleId} className={`text-base font-semibold text-slate-900 ${titleClassName ?? ''}`.trim()}>
          {title}
        </h3>
        <p id={descriptionId} className={`mt-2 text-sm text-slate-600 ${descriptionClassName ?? ''}`.trim()}>
          {description}
        </p>
        <div className={`mt-4 flex items-center justify-end gap-2 ${actionsClassName ?? ''}`.trim()}>
          <button
            type="button"
            className={`rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 ${
              cancelButtonClassName ?? ''
            }`.trim()}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white ${
              confirmButtonClassName ?? ''
            }`.trim()}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useId } from "react"
