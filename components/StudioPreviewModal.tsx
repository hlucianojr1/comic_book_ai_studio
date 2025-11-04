import React from 'react';
import { CloseIcon } from './Icons';

interface StudioPreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

const StudioPreviewModal: React.FC<StudioPreviewModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-gray-900/80 dark:bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-end p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              aria-label="Close preview"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
        </header>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <img
              src={imageUrl}
              alt="Studio Output Preview"
              className="max-w-full max-h-full object-contain shadow-lg"
            />
        </div>
      </div>
    </div>
  );
};

export default StudioPreviewModal;
