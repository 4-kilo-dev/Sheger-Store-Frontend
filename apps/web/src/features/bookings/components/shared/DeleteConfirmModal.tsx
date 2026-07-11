interface DeleteConfirmModalProps {
  /** Title displayed at the top of the modal. */
  title?: string;
  /** Description text explaining what will be deleted. */
  description?: string;
  /** Whether the delete operation is in progress. */
  isDeleting: boolean;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Called when the user cancels / closes the modal. */
  onCancel: () => void;
}

export function DeleteConfirmModal({
  title = "Permanently Delete Attachment",
  description = "Are you sure you want to delete this file? This action is permanent and cannot be undone.",
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h4 className="text-[14px] font-bold text-[var(--destructive)] mb-2">
          {title}
        </h4>
        <p
          className="text-[12px] leading-relaxed mb-4"
          style={{ color: "var(--text-2)" }}
        >
          {description}
        </p>
        <div
          className="flex items-center justify-end gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            disabled={isDeleting}
            onClick={onConfirm}
            className="rounded px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--destructive)] hover:opacity-90 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </button>
          <button
            onClick={onCancel}
            className="rounded border px-3 py-1.5 text-[11px] font-bold"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-2)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
