// src/components/SuccessMessage.jsx
import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const SuccessMessage = ({ message, txHash, explorerBaseUrl, onClose, children }) => {
  const txUrl = txHash && explorerBaseUrl ? `${explorerBaseUrl}/tx/${txHash}` : null;

  return (
    // Remove 'relative' from this line:
    <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-50 max-w-md shadow-lg" role="alert">
      <div className="flex flex-col">
        <div>
            <strong className="font-bold">Success: </strong>
            <span className="block sm:inline">{message}</span>
        </div>
        {txUrl && (
            <a href={txUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-blue-600 hover:underline text-sm font-medium">
                View Transaction <ExternalLink size={12} className="inline ml-1 mb-0.5" />
            </a>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
        {/* The close button needs 'absolute' positioning *relative* to its nearest positioned ancestor.
            Since the main div is now 'fixed', 'absolute' here works correctly relative to the fixed container. */}
        <button
            className="absolute top-1 right-1 p-1 text-green-700 hover:text-green-900"
            onClick={onClose}
            aria-label="Close success message"
        >
            <X className="h-5 w-5" />
        </button>
    </div>
  );
};

export default SuccessMessage;