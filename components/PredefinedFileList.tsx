
import React from 'react';
import { PredefinedFile } from '../types';
import { FileTextIcon } from '../constants'; // Assuming you'll add this icon

interface PredefinedFileListProps {
  files: PredefinedFile[];
  onSelectFile: (file: PredefinedFile) => void;
}

const PredefinedFileList: React.FC<PredefinedFileListProps> = ({ files, onSelectFile }) => {
  if (files.length === 0) {
    return <p className="text-slate-400 text-center">No sample decks available at the moment.</p>;
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => onSelectFile(file)}
          className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600/80 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center group"
          aria-label={`Load ${file.name}`}
        >
          <FileTextIcon className="w-6 h-6 text-sky-400 mr-3 flex-shrink-0 group-hover:text-sky-300 transition-colors" />
          <div>
            <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors">{file.name}</h3>
            {file.description && <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5">{file.description}</p>}
          </div>
        </button>
      ))}
    </div>
  );
};

export default PredefinedFileList;
