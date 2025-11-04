
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, Panel as PanelType } from '../types';
import { LAYOUT_TEMPLATES } from '../constants';
import Panel from './Panel';

interface PageDisplayProps {
  page: Page;
  pageIndex: number;
  updatePage: (pageIndex: number, updatedPage: Partial<Page>) => void;
}

interface GridDividerProps {
  type: 'vertical' | 'horizontal';
  onDrag: (delta: number) => void;
}

// A self-contained divider component with its own drag logic.
const GridDivider: React.FC<GridDividerProps> = ({ type, onDrag }) => {
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = type === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = type === 'vertical' ? 'col-resize' : 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const currentPos = type === 'vertical' ? e.clientX : e.clientY;
    const delta = currentPos - lastPosRef.current;
    if (delta !== 0) {
      onDrag(delta);
    }
    lastPosRef.current = currentPos;
  }, [onDrag, type]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  return (
    <div
      className={`absolute ${type === 'vertical' ? 'top-0 bottom-0 w-4 -ml-2 cursor-col-resize' : 'left-0 right-0 h-4 -mt-2 cursor-row-resize'} z-10 group`}
      onMouseDown={handleMouseDown}
    >
      <div className={`mx-auto my-auto ${type === 'vertical' ? 'w-0.5 h-full' : 'h-0.5 w-full'} bg-transparent group-hover:bg-indigo-500 transition-colors duration-200`} />
    </div>
  );
};


const PageDisplay: React.FC<PageDisplayProps> = ({ page, pageIndex, updatePage }) => {
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(null);
  const layout = LAYOUT_TEMPLATES.find(lt => lt.id === page.layout);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize custom layout state if it doesn't exist
  useEffect(() => {
    if (!page.customLayout && layout && (layout.colCount > 1 || layout.rowCount > 1)) {
      const initialLayout = {
        columns: Array(layout.colCount).fill(1),
        rows: Array(layout.rowCount).fill(1),
      };
      updatePage(pageIndex, { customLayout: initialLayout });
    }
  }, [page.layout, page.customLayout, layout, pageIndex, updatePage]);


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

  const handleGridResize = (type: 'columns' | 'rows', index: number, delta: number) => {
      if (!page.customLayout || !containerRef.current) return;

      const containerSize = type === 'columns' ? containerRef.current.offsetWidth : containerRef.current.offsetHeight;
      const gap = 16; // from gap-4
      const tracks = [...page.customLayout[type]];
      const totalTracks = tracks.length;

      const totalFractions = tracks.reduce((sum, val) => sum + val, 0);
      const totalGaps = (totalTracks - 1) * gap;
      const effectiveSize = containerSize - totalGaps;
      
      const pixelPerFraction = effectiveSize / totalFractions;
      
      // Calculate how much to change the fractions
      const deltaFr = delta / pixelPerFraction;
      
      const newTracks = [...tracks];
      
      // Ensure we don't shrink a track too much
      const minFraction = 0.1; 
      if (newTracks[index] + deltaFr < minFraction || newTracks[index + 1] - deltaFr < minFraction) {
          return;
      }
      
      newTracks[index] += deltaFr;
      newTracks[index + 1] -= deltaFr;
      
      updatePage(pageIndex, {
          customLayout: {
              ...page.customLayout,
              [type]: newTracks,
          }
      });
  };

  const hasFocus = focusedPanelId !== null;
  const gridTemplateStyle = {
    gridTemplateColumns: page.customLayout?.columns.map(c => `${c}fr`).join(' '),
    gridTemplateRows: page.customLayout?.rows.map(r => `${r}fr`).join(' '),
  };

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
      
        <div 
          ref={containerRef}
          className={`relative ${hasFocus ? 'grid grid-cols-1 grid-rows-1' : (layout?.containerClassName || '')} transition-all duration-300 ease-in-out`}
          style={{ 
            ...gridTemplateStyle,
            aspectRatio: '8.5 / 11',
          }}
        >
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

            {/* Render Dividers */}
            {!hasFocus && page.customLayout && layout && (
              <>
                {/* Vertical Dividers */}
                {Array.from({ length: layout.colCount - 1 }).map((_, i) => (
                  <div
                    key={`v-divider-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `calc(${page.customLayout!.columns.slice(0, i + 1).reduce((a, b) => a + b, 0)} / ${page.customLayout!.columns.reduce((a, b) => a + b, 0)} * (100% - ${ (layout.colCount - 1) * 1}rem) + ${i * 1}rem)`
                    }}
                  >
                    <GridDivider type="vertical" onDrag={(dx) => handleGridResize('columns', i, dx)} />
                  </div>
                ))}

                {/* Horizontal Dividers */}
                {Array.from({ length: layout.rowCount - 1 }).map((_, i) => (
                  <div
                    key={`h-divider-${i}`}
                    className="absolute left-0 right-0"
                    style={{
                      top: `calc(${page.customLayout!.rows.slice(0, i + 1).reduce((a, b) => a + b, 0)} / ${page.customLayout!.rows.reduce((a, b) => a + b, 0)} * (100% - ${ (layout.rowCount - 1) * 1}rem) + ${i * 1}rem)`
                    }}
                  >
                    <GridDivider type="horizontal" onDrag={(dy) => handleGridResize('rows', i, dy)} />
                  </div>
                ))}
              </>
            )}

        </div>
    </div>
  );
};

export default PageDisplay;