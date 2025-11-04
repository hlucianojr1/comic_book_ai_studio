

import React, { useState, useEffect, useCallback } from 'react';
import { ComicBook, Page, Panel, LayoutType, StorageOption } from './types';
import { LOCAL_STORAGE_KEY, LAYOUT_TEMPLATES } from './constants';
import Sidebar from './components/Sidebar';
import ComicEditor from './components/ComicEditor';
import ComicStudio from './components/ComicStudio';
import LayoutSelector from './components/LayoutSelector';
import StorageSettings from './components/StorageSettings';
import { generateImage } from './services/geminiService';
import { exportToZip } from './services/exportService';
import { initDB, getImage, saveImage, deleteImages, clearImages } from './services/dbService';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { uploadProject, loadProjectFromPicker } from './services/googleDriveService';

const getInitialState = (): ComicBook => {
  return {
    title: 'My AI Comic',
    globalArtStyle: 'Vintage American Comic',
    globalBackgroundPrompt: 'a futuristic cyberpunk city',
    pages: [],
  };
};

type AppMode = 'studio' | 'editor';

const App: React.FC = () => {
  const [comicBook, setComicBook] = useState<ComicBook>(getInitialState);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLayoutSelectorOpen, setIsLayoutSelectorOpen] = useState<boolean>(false);
  const [isStorageSettingsOpen, setIsStorageSettingsOpen] = useState<boolean>(false);
  const [storageOption, setStorageOption] = useState<StorageOption>('drive');
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to a safe value
  const [appMode, setAppMode] = useState<AppMode>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );

  const { tokenClient, user, isSignedIn, signIn, signOut } = useGoogleAuth();
  
  // Effect to apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // Effect for responsive sidebar
  useEffect(() => {
    if (appMode !== 'editor') {
        setIsSidebarOpen(false);
        return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    // Set initial state based on media query on mount
    setIsSidebarOpen(mediaQuery.matches);
    
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsSidebarOpen(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleMediaQueryChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, [appMode]);
  
  // Load storage preference from localStorage
  useEffect(() => {
    const savedOption = localStorage.getItem('storageOption') as StorageOption;
    if (savedOption) {
      setStorageOption(savedOption);
    }
    initDB();
  }, []);

  // Effect to handle loading local data when switching to local storage
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const savedProject = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedProject) {
          const parsed = JSON.parse(savedProject);
          // Ensure new fields exist
          if (!parsed.globalBackgroundPrompt) {
            parsed.globalBackgroundPrompt = '';
          }
          parsed.pages.forEach((page: Page) => {
            page.isGeneratingBackground = false;
            page.panels.forEach((panel: Panel) => { 
                panel.isLoading = false;
                panel.loadingText = undefined;
            });
          });
          setComicBook(parsed);
          await loadImagesFromDB(parsed.pages);
        } else {
            setComicBook(getInitialState()); // Reset if no local project
        }
      } catch (error) {
        console.error("Failed to parse project from localStorage", error);
        setComicBook(getInitialState());
      }
    };

    if (storageOption === 'local') {
      loadLocalData();
    } else {
      setComicBook(getInitialState()); // Reset when switching to drive
      clearImages(); // Clear indexedDB when switching away from local
    }
  }, [storageOption]);

  const loadImagesFromDB = async (pages: Page[]) => {
      let needsStateUpdate = false;
      const pagesWithLoadedImages = await Promise.all(pages.map(async (page) => {
        const panelsWithLoadedImages = await Promise.all(page.panels.map(async (panel) => {
          if (panel.imageUrl && panel.imageUrl.startsWith('indexeddb:')) {
            const imageData = await getImage(panel.id);
            if (imageData) {
              needsStateUpdate = true;
              return { ...panel, imageUrl: imageData };
            }
          }
          return panel;
        }));

        let loadedSharedBgUrl = page.sharedBackgroundUrl;
        if (page.sharedBackgroundUrl && page.sharedBackgroundUrl.startsWith('indexeddb:')) {
            const bgData = await getImage(page.id);
            if (bgData) {
                needsStateUpdate = true;
                loadedSharedBgUrl = bgData;
            }
        }

        return { ...page, panels: panelsWithLoadedImages, sharedBackgroundUrl: loadedSharedBgUrl };
      }));

      if (needsStateUpdate) {
        setComicBook(prev => ({ ...prev, pages: pagesWithLoadedImages }));
      }
  };

  // Debounced save to localStorage for 'local' mode
  useEffect(() => {
    if (storageOption !== 'local' || appMode !== 'editor') return;

    const handler = setTimeout(() => {
      try {
        const comicToSave = { ...comicBook };
        const cleanedPages = comicToSave.pages.map(page => {
          const cleanedPanels = page.panels.map(panel => {
            let imageUrlToSave = panel.imageUrl;
            if (imageUrlToSave && imageUrlToSave.startsWith('data:image/')) {
              imageUrlToSave = `indexeddb:${panel.id}`;
            }
            return { ...panel, imageUrl: imageUrlToSave, isLoading: undefined, loadingText: undefined };
          });
          let sharedBgUrlToSave = page.sharedBackgroundUrl;
          if(sharedBgUrlToSave && sharedBgUrlToSave.startsWith('data:image/')) {
              sharedBgUrlToSave = `indexeddb:${page.id}`;
          }
          return { ...page, panels: cleanedPanels, sharedBackgroundUrl: sharedBgUrlToSave, isGeneratingBackground: undefined };
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...comicToSave, pages: cleanedPages }));
      } catch (error) {
        console.error("Failed to save project to localStorage", error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert("Error: Could not save the project. The browser's storage quota has been exceeded.");
        }
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [comicBook, storageOption, appMode]);
  
  const handleSetStorageOption = (option: StorageOption) => {
    if (option === storageOption) return;
    if (comicBook.pages.length > 0 && appMode === 'editor' && !window.confirm("Switching storage will clear your current editor session. Are you sure?")) {
        return;
    }
    setStorageOption(option);
    localStorage.setItem('storageOption', option);
    setDriveFileId(null);
  };

  const handleAddPage = (layout: LayoutType, panelCount: number) => {
    const layoutTemplate = LAYOUT_TEMPLATES.find(lt => lt.id === layout);
    if (!layoutTemplate) return;

    const newPage: Page = {
      id: `page-${Date.now()}`,
      layout,
      panels: Array.from({ length: panelCount }, (_, i) => {
        const aspectRatio = layoutTemplate.panelAspectRatios?.[i] || '1:1';
        const [w, h] = aspectRatio.split(':').map(Number);
        const baseSize = 400;
        let pWidth, pHeight;
        
        if (w > h) {
          pHeight = baseSize;
          pWidth = Math.round(baseSize * (w / h));
        } else {
          pWidth = baseSize;
          pHeight = Math.round(baseSize * (h / w));
        }
        
        // Using a dark background that matches the app theme and a light gray text.
        const placeholderUrl = `https://via.placeholder.com/${pWidth}x${pHeight}/1A202C/A0AEC0?text=Panel+${i + 1}`;
        
        return {
          id: `panel-${Date.now()}-${i}`,
          prompt: '',
          imageUrl: placeholderUrl,
          isLoading: false,
          textOverlay: '',
        };
      }),
      backgroundPrompt: '',
      sharedBackgroundUrl: null,
      isGeneratingBackground: false,
    };
    setComicBook(prev => ({ ...prev, pages: [...prev.pages, newPage] }));
    setActivePageIndex(comicBook.pages.length);
    setIsLayoutSelectorOpen(false);
  };
  
  const handleDeletePage = async (pageIndex: number) => {
    if (!window.confirm(`Are you sure you want to delete Page ${pageIndex + 1}?`)) return;

    if (storageOption === 'local') {
        const pageToDelete = comicBook.pages[pageIndex];
        const imageIdsToDelete = pageToDelete.panels.map(p => p.id);
        if (pageToDelete.sharedBackgroundUrl) {
            imageIdsToDelete.push(pageToDelete.id);
        }
        try {
            await deleteImages(imageIdsToDelete);
        } catch(error) {
            console.error("Failed to delete images from IndexedDB:", error);
        }
    }

    setComicBook(prev => {
        const newPages = prev.pages.filter((_, index) => index !== pageIndex);
        if (activePageIndex >= newPages.length) {
            setActivePageIndex(Math.max(0, newPages.length - 1));
        }
        return { ...prev, pages: newPages };
    });
  };

  const updatePage = useCallback((pageIndex: number, updatedPage: Partial<Page>) => {
    setComicBook(prev => {
      const newPages = [...prev.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], ...updatedPage };
      return { ...prev, pages: newPages };
    });
  }, []);

  const handleGeneratePage = async (pageIndex: number) => {
    const page = comicBook.pages[pageIndex];
    const { globalArtStyle, globalBackgroundPrompt } = comicBook;
    const layout = LAYOUT_TEMPLATES.find(lt => lt.id === page.layout);

    const fullBackgroundPrompt = [globalBackgroundPrompt, page.backgroundPrompt].filter(Boolean).join(', ');

    if (fullBackgroundPrompt && !page.sharedBackgroundUrl) {
      updatePage(pageIndex, { isGeneratingBackground: true });
      try {
        const bgPrompt = [globalArtStyle, fullBackgroundPrompt, 'seamless background texture'].filter(Boolean).join(', ');
        const sharedBgUrl = await generateImage(bgPrompt, '1:1');
        if (storageOption === 'local') await saveImage(page.id, sharedBgUrl);
        updatePage(pageIndex, { sharedBackgroundUrl: sharedBgUrl, isGeneratingBackground: false });
      } catch (error) {
        console.error('Background generation failed:', error);
        updatePage(pageIndex, { isGeneratingBackground: false });
        alert('Failed to generate background.');
        return; 
      }
    }
    
    const panelsToGenerate = page.panels.map((panel, index) => ({ panel, index })).filter(({ panel }) => {
        return panel.prompt && (!panel.imageUrl || panel.imageUrl.startsWith('https://via.placeholder.com'));
    });

    if (panelsToGenerate.length === 0) return;

    const initialPanelsState = page.panels.map(p => panelsToGenerate.some(({panel}) => panel.id === p.id) ? { ...p, isLoading: true, loadingText: 'Generating...' } : p);
    updatePage(pageIndex, { panels: initialPanelsState });

    const generationPromises = panelsToGenerate.map(async ({ panel, index: panelIndex }) => {
        try {
            const aspectRatio = layout?.panelAspectRatios?.[panelIndex] || '1:1';
            const backgroundString = fullBackgroundPrompt ? `, with a background of ${fullBackgroundPrompt}` : '';
            const fullPrompt = `${globalArtStyle}, ${panel.prompt}${backgroundString}`;
            const imageUrl = await generateImage(fullPrompt, aspectRatio);
            
            if (storageOption === 'local') await saveImage(panel.id, imageUrl);
            
            setComicBook(currentComic => ({
              ...currentComic,
              pages: currentComic.pages.map((p, pIdx) => pIdx !== pageIndex ? p : {
                  ...p,
                  panels: p.panels.map((pan, panIdx) => panIdx === panelIndex ? { ...pan, imageUrl, isLoading: false, loadingText: undefined } : pan),
              }),
            }));
        } catch (error) {
            console.error(`Panel ${panelIndex + 1} generation failed:`, error);
            alert(`Failed to generate image for panel ${panelIndex + 1}.`);
            setComicBook(currentComic => ({
              ...currentComic,
              pages: currentComic.pages.map((p, pIdx) => pIdx !== pageIndex ? p : {
                  ...p,
                  panels: p.panels.map((pan, panIdx) => panIdx === panelIndex ? { ...pan, isLoading: false, loadingText: undefined } : pan),
              }),
            }));
        }
    });
    await Promise.allSettled(generationPromises);
  };
  
  const handleExport = () => exportToZip(comicBook);
  
  const handleSaveToDrive = async () => {
    if (!isSignedIn) {
      alert("Please sign in to save to Google Drive.");
      return;
    }
    setIsSaving(true);
    try {
      const fileId = await uploadProject(comicBook, driveFileId);
      setDriveFileId(fileId);
      alert("Project saved successfully to Google Drive!");
    } catch (error) {
      console.error("Failed to save to Drive:", error);
      alert("Could not save project to Google Drive. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromDrive = async () => {
    if (!isSignedIn) {
      alert("Please sign in to load from Google Drive.");
      return;
    }
    try {
      const result = await loadProjectFromPicker();
      if (result) {
        await clearImages(); // Clear old images from IndexedDB
        setComicBook(result.comicBook);
        setDriveFileId(result.fileId);
        setActivePageIndex(0);
        alert("Project loaded successfully from Google Drive!");
      }
    } catch (error) {
      console.error("Failed to load from Drive:", error);
      alert("Could not load project from Google Drive. The file may be corrupt or invalid.");
    }
  };


  const canUseEditor = storageOption === 'local' || (storageOption === 'drive' && isSignedIn);

  return (
    <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {isSidebarOpen && appMode === 'editor' && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          aria-hidden="true"
        ></div>
      )}
      {appMode === 'editor' &&
        <Sidebar
            pages={comicBook.pages}
            activePageIndex={activePageIndex}
            onSelectPage={(index) => {
                setActivePageIndex(index);
                if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                }
            }}
            onAddPage={() => setIsLayoutSelectorOpen(true)}
            onDeletePage={handleDeletePage}
            disabled={!canUseEditor}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
      }
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 z-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button onClick={() => setAppMode('studio')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${appMode === 'studio' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        Comic Studio
                    </button>
                    <button onClick={() => setAppMode('editor')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${appMode === 'editor' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        Comic Editor
                    </button>
                </div>
                 <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    {appMode === 'studio' ? 'Automated generation via multi-agent workflow' : 'Manual page-by-page creation'}
                </div>
            </div>
        </header>

        <main className="flex-1 flex">
            {appMode === 'studio' && (
                <ComicStudio theme={theme} onToggleTheme={handleToggleTheme} />
            )}

            {appMode === 'editor' && (
                <>
                    {canUseEditor && comicBook.pages.length > 0 ? (
                    <ComicEditor
                        comicBook={comicBook}
                        setComicBook={setComicBook}
                        activePage={comicBook.pages[activePageIndex]}
                        activePageIndex={activePageIndex}
                        updatePage={updatePage}
                        onGenerate={handleGeneratePage}
                        onExport={handleExport}
                        onOpenStorageSettings={() => setIsStorageSettingsOpen(true)}
                        storageOption={storageOption}
                        onSaveToDrive={handleSaveToDrive}
                        onLoadFromDrive={handleLoadFromDrive}
                        isSaving={isSaving}
                        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                        theme={theme}
                        onToggleTheme={handleToggleTheme}
                    />
                    ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center">
                        {storageOption === 'drive' && !isSignedIn ? (
                            <>
                                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Welcome to the AI Comic Creator!</h2>
                                <p className="mb-8 max-w-md">Please sign in with your Google account to save your projects to Google Drive and get started.</p>
                                <button
                                    onClick={signIn}
                                    className="px-6 py-3 bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors font-semibold text-white"
                                >
                                    Sign in with Google
                                </button>
                                <button onClick={() => setIsStorageSettingsOpen(true)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    Or use Local Storage
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Your canvas awaits!</h2>
                                <p className="mb-8">Add a new page using the sidebar to begin your story.</p>
                                <button
                                onClick={() => setIsLayoutSelectorOpen(true)}
                                className="px-6 py-3 bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors font-semibold text-white"
                                >
                                Create First Page
                                </button>
                            </>
                        )}
                    </div>
                    )}
                </>
            )}
        </main>
      </div>
      {isLayoutSelectorOpen && (
        <LayoutSelector onSelect={handleAddPage} onClose={() => setIsLayoutSelectorOpen(false)} />
      )}
      {isStorageSettingsOpen && (
        <StorageSettings 
            onClose={() => setIsStorageSettingsOpen(false)}
            storageOption={storageOption}
            setStorageOption={handleSetStorageOption}
            user={user}
            isSignedIn={isSignedIn}
            signIn={signIn}
            signOut={signOut}
        />
      )}
    </div>
  );
};

export default App;