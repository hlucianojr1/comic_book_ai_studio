import React, { useState, useRef, WheelEvent, MouseEvent } from 'react';
import { StudioStepInfo, StepStatus } from '../types';
import { RobotIcon } from './Icons';
import Spinner from './Spinner';

interface StudioCanvasProps {
  history: StudioStepInfo[];
}

const StudioCanvas: React.FC<StudioCanvasProps> = ({ history }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ startX: 0, startY: 0, transformX: 0, transformY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    setTransform(prev => {
        const newScale = Math.max(0.1, Math.min(3, prev.scale + scaleAmount));
        // This is a simplified zoom. A more advanced version would zoom towards the mouse pointer.
        return { ...prev, scale: newScale };
    });
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Allows panning with left-click or middle mouse button
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      transformX: transform.x,
      transformY: transform.y,
    };
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    setTransform(prev => ({
      ...prev,
      x: panStartRef.current.transformX + dx,
      y: panStartRef.current.transformY + dy,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  // Show placeholders for all visual steps (step 5 onwards) even before they have an image
  const visualSteps = history.filter(step => step.imageUrl || step.step >= 5);

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full bg-gray-100 dark:bg-gray-900/80 overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
        <div 
            className="flex items-center gap-8 p-12 transition-transform duration-100 ease-linear"
            style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: 'center center',
            }}
        >
            {visualSteps.map((step) => (
                <div key={step.step} className="w-[400px] h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col flex-shrink-0 border-2 border-gray-300 dark:border-gray-700">
                    <header className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Step {step.step}: {step.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{step.agent.split(':')[1].trim()}</p>
                    </header>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700/50 flex items-center justify-center relative">
                        {step.imageUrl ? (
                             <img src={step.imageUrl} alt={`Output for ${step.title}`} className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                                <RobotIcon className="w-12 h-12 mx-auto"/>
                                <p className="mt-2 text-sm">{step.status === StepStatus.IN_PROGRESS ? 'Agent is working...' : 'Awaiting visual output...'}</p>
                            </div>
                        )}
                        {step.status === StepStatus.IN_PROGRESS && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spinner/></div>}
                    </div>
                     {step.summary && <footer className="p-3 text-xs italic text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 h-20 overflow-y-auto">{step.summary}</footer>}
                </div>
            ))}
        </div>
        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs rounded-full px-3 py-1 pointer-events-none">
            Click & Drag to Pan | Scroll to Zoom
        </div>
    </div>
  );
};

export default StudioCanvas;
