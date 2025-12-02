
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
    return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-green-900 text-green-300 border border-green-700 uppercase tracking-wide shadow-sm">Verified</span>;
  }
  if (status === 'pending') {
    return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-yellow-900 text-yellow-300 border border-yellow-700 uppercase tracking-wide shadow-sm">Pending</span>;
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
        console.error("Follow action error:", error);
        addToast('Action failed. Please check your permissions or connection.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group w-full bg-slate-800 rounded-xl shadow-md border border-slate-700 hover:border-green-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start space-x-3 mb-2">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden ring-2 ring-slate-600 group-hover:ring-green-500 transition-all">
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
              </div>
              {isOnline && (
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-slate-800" title="Online"></span>
              )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-col">
                <h3 className="font-bold text-white text-base truncate leading-tight">{user.name}</h3>
                <p className="text-xs text-green-400 truncate font-medium mt-0.5">{user.profession || "Member"}</p>
              </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 mb-1">
            <StatusBadge status={user.status} />
            <span className="text-[10px] text-gray-300 bg-slate-700 px-2 py-1 rounded-full truncate max-w-[120px] border border-slate-600">{user.circle}</span>
        </div>
      </div>

      {/* Stats & Button Row - Separated by background color */}
      <div className="bg-slate-900/50 p-3 border-t border-slate-700 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500 font-medium ml-1">
                <span className="text-white font-bold text-sm">{user.followers?.length || 0}</span> Followers
          </div>

          {!isOwnProfile && (
            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={`
                    flex-shrink-0 flex items-center justify-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all transform active:scale-95
                    ${isFollowing 
                        ? 'bg-slate-700 text-gray-300 border border-slate-600 hover:bg-slate-600' 
                        : 'bg-green-600 text-white border border-green-500 hover:bg-green-500 hover:shadow-green-500/20'
                    }
                `}
            >
                {isLoading ? (
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                ) : isFollowing ? (
                    <>
                        <UserCheckIcon className="h-3.5 w-3.5" />
                        <span>Following</span>
                    </>
                ) : (
                    <>
                        <UserPlusIcon className="h-3.5 w-3.5" />
                        <span>Follow</span>
                    </>
                )}
            </button>
          )}
      </div>
    </div>
  );
};
