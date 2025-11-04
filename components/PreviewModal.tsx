
import React from 'react';
import saveAs from 'file-saver';
import Spinner from './Spinner';
import { CloseIcon, DownloadIcon } from './Icons';

interface PreviewModalProps {
  isLoading: boolean;
  imageUrl: string | null;
  onClose: () => void;
  comicTitle: string;
  pageIndex: number;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isLoading, imageUrl, onClose, comicTitle, pageIndex }) => {

  const handleDownload = () => {
    if (imageUrl) {
      const safeTitle = comicTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const pageNum = (pageIndex + 1).toString().padStart(2, '0');
      saveAs(imageUrl, `${safeTitle}_page_${pageNum}.jpg`);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/70 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Page Preview</h2>
          <div className="flex items-center gap-2">
             <button
                onClick={handleDownload}
                disabled={!imageUrl || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                title="Download Page Image"
            >
                <DownloadIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              aria-label="Close preview"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          {isLoading ? (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Generating high-quality preview...</p>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={`Preview of page ${pageIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-lg"
            />
          ) : (
             <div className="text-center text-red-500">
                <p>Could not generate preview.</p>
                <p className="text-sm">Please ensure all panels have images.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
