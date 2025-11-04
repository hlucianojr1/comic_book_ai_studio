import React from 'react';
import { StorageOption } from '../types';
import { GoogleDriveIcon } from './Icons';

interface StorageSettingsProps {
  onClose: () => void;
  storageOption: StorageOption;
  setStorageOption: (option: StorageOption) => void;
  user: any; // Simplified user profile object
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({
  onClose,
  storageOption,
  setStorageOption,
  user,
  isSignedIn,
  signIn,
  signOut,
}) => {
  return (
    <div 
      className="fixed inset-0 bg-gray-900/70 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Storage Settings</h2>
        
        <div className="space-y-4">
            <p className="text-gray-500 dark:text-gray-400">Choose where to save your comic projects.</p>
            <div className="flex rounded-md border border-gray-300 dark:border-gray-600">
                <button 
                    onClick={() => setStorageOption('drive')}
                    className={`flex-1 p-3 text-center rounded-l-md transition-colors ${storageOption === 'drive' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                    Google Drive
                </button>
                <button
                    onClick={() => setStorageOption('local')}
                    className={`flex-1 p-3 text-center rounded-r-md transition-colors ${storageOption === 'local' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                    Local Browser
                </button>
            </div>
        </div>

        {storageOption === 'drive' && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                {isSignedIn && user ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.picture} alt="User" className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={signOut} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 font-semibold">
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="mb-4 text-gray-500 dark:text-gray-400">Sign in with Google to save and load your projects from the cloud.</p>
                        <button 
                            onClick={signIn} 
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-semibold rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                        >
                            <GoogleDriveIcon className="w-6 h-6 text-gray-700"/>
                            Sign in with Google
                        </button>
                    </div>
                )}
            </div>
        )}

        {storageOption === 'local' && (
             <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-md border border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/50 dark:border-yellow-700">
                    <strong>Warning:</strong> Local storage is tied to your browser. Clearing your browser data will permanently delete your projects. For safety, always download your work.
                </p>
             </div>
        )}

        <button 
          onClick={onClose}
          className="mt-8 w-full py-2 bg-gray-600 text-white hover:bg-gray-500 rounded-md font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default StorageSettings;