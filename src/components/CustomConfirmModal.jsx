import React, { useEffect } from "react";
import { LogOut } from "lucide-react";

const CustomConfirmModal = ({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel" 
}) => {
  
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Close if click outside modal content
  const handleOverlayClick = (e) => {
    if (e.target.id === "modal-overlay") {
      onCancel();
    }
  };

  return (
    <div
      id="modal-overlay"
      className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1000]"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center mb-4">
          <LogOut className="h-6 w-6 text-red-500 mr-2" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirmModal;
