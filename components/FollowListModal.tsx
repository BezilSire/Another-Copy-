
import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserMinusIcon } from './icons/UserMinusIcon';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userIds: string[];
  currentUser: User;
  onViewProfile: (userId: string) => void;
  canManage: boolean; // If true, allows unfollowing (for "Following" list)
}

export const FollowListModal: React.FC<FollowListModalProps> = ({ isOpen, onClose, title, userIds, currentUser, onViewProfile, canManage }) => {
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userIds.length > 0) {
      setIsLoading(true);
      api.getPublicUserProfilesByUids(userIds)
        .then(setUsers)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
        setUsers([]);
        setIsLoading(false);
    }
  }, [isOpen, userIds]);

  const handleUnfollow = async (targetId: string) => {
      setProcessingId(targetId);
      try {
          await api.unfollowUser(currentUser.id, targetId);
          setUsers(prev => prev.filter(u => u.id !== targetId));
      } catch (error) {
          console.error("Failed to unfollow", error);
      } finally {
          setProcessingId(null);
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
            <h3 className="text-lg font-medium text-white" id="modal-title">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
          </div>
          
          <div className="h-96 overflow-y-auto p-2 bg-slate-800">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <LoaderIcon className="h-8 w-8 animate-spin text-green-500" />
                </div>
            ) : users.length > 0 ? (
                <ul className="space-y-1">
                    {users.map(user => (
                        <li key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-700 rounded-md transition-colors">
                            <button 
                                onClick={() => { onViewProfile(user.id); onClose(); }}
                                className="flex items-center space-x-3 flex-1 text-left"
                            >
                                <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-white text-sm">{user.name}</p>
                                    <p className="text-xs text-gray-400">{user.circle}</p>
                                </div>
                            </button>
                            {canManage && (
                                <button 
                                    onClick={() => handleUnfollow(user.id)} 
                                    disabled={!!processingId}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-600 rounded-full transition-colors"
                                    title="Unfollow"
                                >
                                    {processingId === user.id ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <UserMinusIcon className="h-5 w-5" />}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 mt-10">No users found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
