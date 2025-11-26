import React from 'react';
import { EyeIcon } from './Icons';

interface CodePreviewProps {
  code: string;
  onClose: () => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ code, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <EyeIcon className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">App Preview</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 bg-white relative">
            <iframe 
                srcDoc={code}
                className="w-full h-full border-0"
                title="App Preview"
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            />
        </div>
      </div>
    </div>
  );
};
