interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  /** 默认“确定” */
  confirmText?: string
  /** 不传 cancelText 时只渲染确认按钮（信息弹窗） */
  cancelText?: string
  /** 危险操作（删除等），确认按钮显示红色 */
  danger?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const showCancel = cancelText !== undefined && onCancel !== undefined

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-card border border-gray-border bg-gray-card p-5 shadow-card backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-card-title text-gray-text-primary">{title}</h2>
        {message && (
          <p className="mt-2 whitespace-pre-line text-helper text-gray-text-secondary">{message}</p>
        )}
        <div className={`mt-5 gap-3 ${showCancel ? 'grid grid-cols-2' : 'flex'}`}>
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-button border border-gray-border bg-gray-card text-body font-medium text-gray-text-primary backdrop-blur-xl transition-colors hover:border-primary/30"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-11 flex-1 items-center justify-center rounded-button text-body font-medium text-white transition-all ${
              danger
                ? 'bg-danger shadow-[0_10px_22px_rgba(217,72,95,0.22)] hover:opacity-95'
                : 'bg-primary shadow-[0_10px_22px_rgba(62,99,221,0.22)] hover:bg-primary-dark'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
