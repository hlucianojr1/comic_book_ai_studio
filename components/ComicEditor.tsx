

import React, { useState, useRef } from 'react';
import { ComicBook, Page, StorageOption } from '../types';
import PageDisplay from './PageDisplay';
import { DownloadIcon, GoogleDriveIcon, SettingsIcon, SaveIcon, MenuIcon, PreviewIcon, SunIcon, MoonIcon, MaximizeIcon, MinimizeIcon } from './Icons';
import Spinner from './Spinner';
import { ART_STYLES } from '../constants';
import { renderPageAsImage } from '../services/previewService';
import PreviewModal from './PreviewModal';
import { useFullscreen } from '../hooks/useGoogleAuth';

interface ComicEditorProps {
  comicBook: ComicBook;
  setComicBook: React.Dispatch<React.SetStateAction<ComicBook>>;
  activePage: Page;
  activePageIndex: number;
  updatePage: (pageIndex: number, updatedPage: Partial<Page>) => void;
  onGenerate: (pageIndex: number) => void;
  onExport: () => void;
  onOpenStorageSettings: () => void;
  storageOption: StorageOption;
  onSaveToDrive: () => void;
  onLoadFromDrive: () => void;
  isSaving: boolean;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const ComicEditor: React.FC<ComicEditorProps> = ({
  comicBook,
  setComicBook,
  activePage,
  activePageIndex,
  updatePage,
  onGenerate,
  onExport,
  onOpenStorageSettings,
  storageOption,
  onSaveToDrive,
  onLoadFromDrive,
  isSaving,
  onToggleSidebar,
  theme,
  onToggleTheme,
}) => {
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(fullscreenRef);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComicBook(prev => ({ ...prev, title: e.target.value }));
  };

  const handleArtStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setComicBook(prev => ({ ...prev, globalArtStyle: e.target.value }));
  };
  
  const handleGenerateClick = () => {
    onGenerate(activePageIndex);
  };
  
  const handlePreview = async () => {
    setIsPreviewing(true);
    setIsPreviewLoading(true);
    try {
        const imageUrl = await renderPageAsImage(activePage, comicBook);
        setPreviewImage(imageUrl);
    } catch (error) {
        console.error("Failed to render page preview:", error);
        setPreviewImage(null);
        alert(`Could not generate preview. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsPreviewLoading(false);
    }
  };

  return (
    <div ref={fullscreenRef} className="flex-1 flex flex-col bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shadow-sm z-10">
        <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center gap-2">
                <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden" aria-label="Toggle Sidebar">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <input
                    type="text"
                    value={comicBook.title}
                    onChange={handleTitleChange}
                    className="text-lg font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md px-2 py-1"
                />
                 <select
                    value={comicBook.globalArtStyle}
                    onChange={handleArtStyleChange}
                    className="text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                    {ART_STYLES.map(style => (
                        <option key={style} value={style}>{style}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Toggle Theme">
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
                <button onClick={toggleFullscreen} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                    {isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                
                <button onClick={onOpenStorageSettings} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Storage Settings">
                    <SettingsIcon className="w-5 h-5" />
                </button>
                 {storageOption === 'drive' && (
                    <>
                    <button onClick={onLoadFromDrive} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Load from Google Drive">
                        <GoogleDriveIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onSaveToDrive} disabled={isSaving} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Save to Google Drive">
                       {isSaving ? <Spinner /> : <SaveIcon className="w-5 h-5" />}
                    </button>
                    </>
                )}
                <button onClick={onExport} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Export Project ZIP">
                    <DownloadIcon className="w-5 h-5" />
                </button>
                <button onClick={handlePreview} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Preview Page">
                    <PreviewIcon className="w-5 h-5" />
                </button>
                 <button 
                    onClick={handleGenerateClick} 
                    className="ml-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 transition-colors text-sm"
                >
                    Generate Page
                </button>
            </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <PageDisplay page={activePage} pageIndex={activePageIndex} updatePage={updatePage} />
      </main>
      {isPreviewing && (
        <PreviewModal 
            isLoading={isPreviewLoading}
            imageUrl={previewImage}
            onClose={() => setIsPreviewing(false)}
            comicTitle={comicBook.title}
            pageIndex={activePageIndex}
        />
      )}
    </div>
  );
};

export default ComicEditor;
