import React from 'react';
import { Page } from '../types';
import { PlusIcon, TrashIcon, CloseIcon } from './Icons';

interface SidebarProps {
  pages: Page[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  disabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ pages, activePageIndex, onSelectPage, onAddPage, onDeletePage, disabled = false, isOpen, onClose }) => {
  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col p-4 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Comic Pages Sidebar"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comic Pages</h1>
        <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white md:hidden" aria-label="Close sidebar">
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className={disabled ? 'opacity-50 pointer-events-none' : ''}>
          {pages.map((page, index) => (
            <li key={page.id} className="mb-2">
              <div
                className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                  activePageIndex === index
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span onClick={() => onSelectPage(index)} className="flex-grow">
                  Page {index + 1}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(index);
                  }} 
                  className="ml-2 p-1 rounded hover:bg-red-500/50 text-gray-500 dark:text-gray-400 hover:text-white transition-colors"
                  aria-label={`Delete Page ${index + 1}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </nav>
      <button
        onClick={onAddPage}
        disabled={disabled}
        className="mt-4 w-full flex items-center justify-center py-3 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        Add Page
      </button>
    </aside>
  );
};

export default Sidebar;