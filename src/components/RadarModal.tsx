
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
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-80 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        
        <div className="relative bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 transform transition-all animate-fade-in flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center space-x-2 text-green-400">
                <TargetIcon className="h-6 w-6" />
                <h3 className="text-lg font-bold text-white">Connection Radar</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 bg-black/20">
            <p className="text-sm text-gray-300 text-center mb-4">
                Discover active members in your circle and beyond. Click a node to connect.
            </p>
            <div className="h-[500px] w-full">
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
