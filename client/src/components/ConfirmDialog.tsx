interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">{message}</p>

        <div className="flex gap-2 justify-end pt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}