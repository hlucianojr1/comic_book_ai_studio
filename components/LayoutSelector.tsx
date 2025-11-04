
import React from 'react';
import { LAYOUT_TEMPLATES } from '../constants';
import { LayoutType } from '../types';

interface LayoutSelectorProps {
  onSelect: (layout: LayoutType, panelCount: number) => void;
  onClose: () => void;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({ onSelect, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-gray-900/70 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Choose a Page Layout</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LAYOUT_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id, template.panelCount)}
              className="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-left hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/50 group"
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-white">{template.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2 group-hover:text-gray-200">{template.description}</p>
            </button>
          ))}
        </div>
        <button 
          onClick={onClose}
          className="mt-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LayoutSelector;