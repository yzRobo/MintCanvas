import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ErrorMessage = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative z-50" role="alert">
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{message}</span>
      <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => { setIsVisible(false); onClose(); }}>
        <X className="h-6 w-6 text-red-500" />
      </span>
    </div>
  );
};

export default ErrorMessage;
