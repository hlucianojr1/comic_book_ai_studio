
import React, { useState, useRef, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Panel as PanelType } from '../types';
import Spinner from './Spinner';
import { ImageIcon, LinkIcon, ZoomInIcon, ZoomOutIcon, ExpandIcon, FocusIcon, CollapseIcon } from './Icons';

interface PanelProps {
  panel: PanelType;
  onPanelChange: (updatedPanel: Partial<PanelType>) => void;
  aspectRatio: string;
  isFocused: boolean;
  onToggleFocus: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
  });
};

const Panel: React.FC<PanelProps> = ({ panel, onPanelChange, aspectRatio, isFocused, onToggleFocus }) => {
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPanelChange({ prompt: e.target.value });
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPanelChange({ textOverlay: e.target.value });
  };

  const handleUrlPaste = async () => {
    const userInput = prompt("Paste a direct image URL:");
    if (userInput) {
        let url = userInput.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        try {
            new URL(url); // Quick validation
        } catch (_) {
            alert("Invalid URL provided. Please enter a full and valid URL.");
            return;
        }
        
        onPanelChange({ isLoading: true, loadingText: 'Loading image...' });

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`The server responded with status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('The URL does not point to a valid image file (e.g., PNG, JPG).');
            }

            const blob = await response.blob();
            const imageDataUrl = await blobToBase64(blob);
            
            onPanelChange({ imageUrl: imageDataUrl, isLoading: false, loadingText: undefined, prompt: panel.prompt || `Image from URL` });

        } catch (error) {
            console.error("Error loading image from URL:", error);
            let errorMessage = "An unknown error occurred."
            if (error instanceof TypeError) { // This often indicates a CORS or network issue
                errorMessage = "Could not load image. This may be due to a network error or browser security restrictions (CORS) from the image's website. Please ensure you are using a direct link to a publicly accessible image.";
            } else if (error instanceof Error) {
                errorMessage = `Failed to load image: ${error.message}`;
            }
            alert(errorMessage);
            onPanelChange({ isLoading: false, loadingText: undefined });
        }
    }
  };

  // Zoom and Pan state and refs
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  const MAX_SCALE = 5;
  const MIN_SCALE = 1;
  const ZOOM_SPEED = 0.2;

  const handleReset = () => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  };

  const clampPosition = (pos: {x: number, y: number}, currentScale: number) => {
    const container = imageContainerRef.current;
    if (!container) return pos;

    const maxPanX = (container.clientWidth * (currentScale - 1)) / 2;
    const maxPanY = (container.clientHeight * (currentScale - 1)) / 2;

    return {
        x: Math.max(-maxPanX, Math.min(maxPanX, pos.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, pos.y)),
    };
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!panel.imageUrl) return;
    e.preventDefault();
    
    const newScale = scale - (e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED);
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    
    if (clampedScale <= MIN_SCALE) {
        handleReset();
    } else {
        const newPosition = clampPosition(position, clampedScale);
        setScale(clampedScale);
        setPosition(newPosition);
    }
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (scale <= MIN_SCALE || !panel.imageUrl) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y
    };
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    
    const newPosition = {
        x: panStartRef.current.posX + dx,
        y: panStartRef.current.posY + dy
    };
    
    setPosition(clampPosition(newPosition, scale));
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
      const newScale = Math.min(scale + ZOOM_SPEED * 2, MAX_SCALE);
      setScale(newScale);
  };
  
  const handleZoomOut = () => {
      const newScale = Math.max(scale - ZOOM_SPEED * 2, MIN_SCALE);
      if (newScale <= MIN_SCALE) {
          handleReset();
      } else {
          const newPosition = clampPosition(position, newScale);
          setScale(newScale);
          setPosition(newPosition);
      }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md flex flex-col h-full">
      <div 
        ref={imageContainerRef}
        className="bg-gray-200/50 dark:bg-gray-700/50 flex-1 flex items-center justify-center relative overflow-hidden group"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ 
            aspectRatio: aspectRatio.replace(':', ' / '),
            cursor: scale > MIN_SCALE ? (isPanning ? 'grabbing' : 'grab') : 'default' 
        }}
      >
        {panel.isLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
            <Spinner />
            <p className="mt-2 text-sm text-gray-300">{panel.loadingText || 'Generating...'}</p>
          </div>
        )}
        {panel.imageUrl ? (
          <>
            <img 
              src={panel.imageUrl} 
              alt={panel.prompt} 
              className="w-full h-full object-cover"
              style={{ 
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                cursor: 'inherit',
                maxWidth: 'none',
              }} 
              draggable="false"
            />
             {panel.textOverlay && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-center text-sm z-20 pointer-events-none">
                    <p style={{ textShadow: '1px 1px 2px black' }}>{panel.textOverlay}</p>
                </div>
            )}
            <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button onClick={onToggleFocus} title={isFocused ? "Show All Panels" : "Focus on Panel"} className="p-1 text-white hover:bg-white/20 rounded">
                {isFocused ? <CollapseIcon className="w-5 h-5"/> : <FocusIcon className="w-5 h-5"/>}
              </button>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/50 p-1 rounded-md flex items-center gap-1 z-20">
                <button onClick={handleZoomIn} title="Zoom In" className="p-1 text-white hover:bg-white/20 rounded"><ZoomInIcon className="w-5 h-5"/></button>
                <button onClick={handleZoomOut} title="Zoom Out" className="p-1 text-white hover:bg-white/20 rounded"><ZoomOutIcon className="w-5 h-5"/></button>
                {scale > MIN_SCALE && <button onClick={handleReset} title="Reset View" className="p-1 text-white hover:bg-white/20 rounded"><ExpandIcon className="w-5 h-5"/></button>}
            </div>
          </>
        ) : (
          !panel.isLoading && (
            <div className="text-gray-400 dark:text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto" />
              <p className="mt-2 text-center text-sm">No Image</p>
            </div>
          )
        )}
      </div>
      <div className="p-2 border-t-2 border-gray-300 dark:border-gray-600 flex flex-col">
        <textarea
          value={panel.textOverlay}
          onChange={handleTextChange}
          placeholder="Caption / Speech text..."
          className="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-2"
          rows={2}
        />
        <textarea
          value={panel.prompt}
          onChange={handlePromptChange}
          placeholder="Describe the scene for this panel..."
          className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none flex-grow"
          rows={3}
        />
        <button 
          onClick={handleUrlPaste} 
          className="mt-2 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1 self-start p-1"
          title="Use external image URL"
        >
          <LinkIcon className="w-3 h-3"/>
          Use URL
        </button>
      </div>
    </div>
  );
};

export default Panel;
