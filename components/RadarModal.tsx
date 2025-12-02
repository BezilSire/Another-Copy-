
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { ConnectionRadar } from './ConnectionRadar';
import { User } from '../types';
import { TargetIcon } from './icons/TargetIcon';

interface RadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onStartChat: (targetUserId: string) => void;
}

export const RadarModal: React.FC<RadarModalProps> = ({ isOpen, onClose, currentUser, onViewProfile, onStartChat }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-90 transition-opacity" onClick={onClose} aria-hidden="true"></div>
      
      {/* Modal Container - Full screen on mobile, centered on desktop */}
      <div className="absolute inset-0 sm:flex sm:items-center sm:justify-center sm:p-4 pointer-events-none">
        <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-slate-900 sm:bg-slate-800 sm:rounded-xl shadow-2xl border-0 sm:border border-slate-700 transform transition-all animate-fade-in flex flex-col pointer-events-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900 sm:bg-transparent z-10">
            <div className="flex items-center space-x-2 text-green-400">
                <TargetIcon className="h-6 w-6" />
                <h3 className="text-lg font-bold text-white">Connection Radar</h3>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors bg-slate-800 rounded-full sm:bg-transparent">
              <XCircleIcon className="h-8 w-8 sm:h-6 sm:w-6" />
            </button>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 relative bg-black/20 overflow-hidden flex flex-col">
            <div className="absolute top-4 left-0 right-0 z-10 px-4 text-center pointer-events-none">
                 <p className="text-sm text-gray-400/80 bg-slate-900/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                    Tap a node to connect
                </p>
            </div>
            
            {/* Radar Container - Fills remaining space */}
            <div className="flex-grow w-full relative min-h-[400px]">
                <ConnectionRadar 
                    currentUser={currentUser} 
                    onViewProfile={(id) => { onViewProfile(id); onClose(); }} 
                    onStartChat={(id) => { onStartChat(id); onClose(); }} 
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
