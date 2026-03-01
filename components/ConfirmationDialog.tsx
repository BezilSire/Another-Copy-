import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-midnight-light border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-premium relative overflow-hidden">
        <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
        
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        
        <p className="text-white/70 text-sm font-medium leading-relaxed mb-8">
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
          >
            {confirmButtonText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all active:scale-[0.98] border border-white/5 uppercase tracking-widest text-[10px]"
          >
            {cancelButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
