
import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { UserCheckIcon } from './icons/UserCheckIcon';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';

interface UserCardProps {
  user: PublicUserProfile;
  currentUser: User;
  onClick: () => void;
  isOnline?: boolean;
}

const StatusBadge: React.FC<{ status: User['status'] }> = ({ status }) => {
  if (status === 'active') {
    return <span className="ml-2 text-xs font-medium bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Verified</span>;
  }
  if (status === 'pending') {
    return <span className="ml-2 text-xs font-medium bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">Pending Verification</span>;
  }
  return null;
};

export const UserCard: React.FC<UserCardProps> = ({ user, currentUser, onClick, isOnline }) => {
  const isOwnProfile = currentUser.id === user.id;
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
      setIsFollowing(currentUser.following?.includes(user.id) || false);
  }, [currentUser.following, user.id]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isLoading) return;
    
    setIsLoading(true);
    try {
        if (isFollowing) {
            await api.unfollowUser(currentUser.id, user.id);
            setIsFollowing(false);
            addToast(`Unfollowed ${user.name}`, 'info');
        } else {
            await api.followUser(currentUser, user.id);
            setIsFollowing(true);
            addToast(`Following ${user.name}`, 'success');
        }
    } catch (error) {
        console.error(error);
        addToast('Action failed. Please try again.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="w-full h-full text-left bg-slate-800 p-4 rounded-lg shadow-md hover:bg-slate-700/50 hover:ring-2 hover:ring-green-500 transition-all duration-200 cursor-pointer flex flex-col justify-center min-h-[110px] relative group"
    >
      <div className="flex items-center space-x-4">
        <div className="relative flex-shrink-0">
          <UserCircleIcon className="h-12 w-12 text-gray-400" />
          {isOnline && (
            <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-slate-800" title="Online"></span>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <div className="flex items-center">
            <p className="font-bold text-white truncate">{user.name}</p>
            <StatusBadge status={user.status} />
          </div>
          <p className="text-sm text-gray-400 truncate">{user.circle}</p>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
             <span>{user.followers?.length || 0} Followers</span>
          </div>
        </div>
      </div>

      {!isOwnProfile && (
          <button
            onClick={handleFollowToggle}
            disabled={isLoading}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
                isFollowing 
                ? 'bg-slate-700 text-green-400 hover:bg-red-900/50 hover:text-red-400' 
                : 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white'
            }`}
            title={isFollowing ? "Unfollow" : "Follow"}
          >
            {isLoading ? (
                <LoaderIcon className="h-5 w-5 animate-spin" />
            ) : isFollowing ? (
                <UserCheckIcon className="h-5 w-5" />
            ) : (
                <UserPlusIcon className="h-5 w-5" />
            )}
          </button>
      )}
    </div>
  );
};
