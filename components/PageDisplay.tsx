
import React, { useState } from 'react';
import { Page, Panel as PanelType } from '../types';
import { LAYOUT_TEMPLATES } from '../constants';
import Panel from './Panel';

interface PageDisplayProps {
  page: Page;
  pageIndex: number;
  updatePage: (pageIndex: number, updatedPage: Partial<Page>) => void;
}

const PageDisplay: React.FC<PageDisplayProps> = ({ page, pageIndex, updatePage }) => {
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(null);
  const layout = LAYOUT_TEMPLATES.find(lt => lt.id === page.layout);

  const handlePanelChange = (panelIndex: number, updatedPanel: Partial<PanelType>) => {
    const newPanels = [...page.panels];
    newPanels[panelIndex] = { ...newPanels[panelIndex], ...updatedPanel };
    updatePage(pageIndex, { panels: newPanels });
  };
  
  const handleBackgroundPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePage(pageIndex, { backgroundPrompt: e.target.value });
  };

  const handleToggleFocus = (panelId: string) => {
    setFocusedPanelId(currentId => (currentId === panelId ? null : panelId));
  };

  const hasFocus = focusedPanelId !== null;
  const containerClasses = hasFocus
    ? 'grid grid-cols-1 grid-rows-1'
    : layout?.containerClassName || '';

  return (
    <div className="max-w-5xl mx-auto">
        <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg mb-6 flex items-center gap-4 transition-opacity duration-300 ${hasFocus ? 'opacity-0 h-0 p-0 m-0 overflow-hidden' : 'opacity-100'}`}>
            <label htmlFor={`bg-prompt-${page.id}`} className="font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0">
                Shared Background Prompt (Optional):
            </label>
            <input
                id={`bg-prompt-${page.id}`}
                type="text"
                value={page.backgroundPrompt}
                onChange={handleBackgroundPromptChange}
                placeholder="e.g., a bustling futuristic city at night"
                className="flex-grow bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
        </div>
      
        <div className={`${containerClasses} transition-all duration-300 ease-in-out`} style={{ aspectRatio: '8.5 / 11' }}>
            {page.panels.map((panel, index) => {
                const isFocused = panel.id === focusedPanelId;

                const panelWrapperClasses =
                    hasFocus
                    ? (isFocused ? 'w-full h-full' : 'hidden')
                    : (layout?.panelClassNames?.[index] || '');

                return (
                    <div key={panel.id} className={`${panelWrapperClasses} transition-all duration-300 ease-in-out`}>
                        <Panel
                            panel={panel}
                            onPanelChange={(updatedPanel) => handlePanelChange(index, updatedPanel)}
                            aspectRatio={layout?.panelAspectRatios?.[index] || '1:1'}
                            isFocused={isFocused}
                            onToggleFocus={() => handleToggleFocus(panel.id)}
                        />
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default PageDisplay;