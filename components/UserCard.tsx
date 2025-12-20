
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
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-900/50 text-green-300 border border-green-700/50 uppercase tracking-wide shadow-sm">Verified</span>;
  }
  if (status === 'pending') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 uppercase tracking-wide shadow-sm">Pending</span>;
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
        addToast('Action failed. Check permissions.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group w-full bg-slate-800 rounded-xl shadow-sm border border-slate-700 hover:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full overflow-hidden"
    >
      {/* Main Content Area */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden ring-1 ring-slate-600 group-hover:ring-green-500/50 transition-all">
                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                </div>
                {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-800" title="Online"></span>
                )}
            </div>
            
            {/* Name & Status */}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm sm:text-base truncate leading-tight">{user.name}</h3>
                <p className="text-xs text-green-400 truncate font-medium mt-0.5 mb-1.5">{user.profession || "Member"}</p>
                
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={user.status} />
                    {user.circle && (
                        <span className="text-[10px] text-gray-400 bg-slate-900/50 px-2 py-0.5 rounded-full truncate max-w-[100px] border border-slate-700">
                            {user.circle}
                        </span>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Footer Area - Separate from content to prevent overlap */}
      <div className="bg-slate-900/30 px-4 py-3 border-t border-slate-700/50 flex items-center justify-between gap-2 mt-auto">
          <div className="text-xs text-gray-500 font-medium">
                <span className="text-white font-bold">{user.followers?.length || 0}</span> Followers
          </div>

          {!isOwnProfile && (
            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={`
                    flex-shrink-0 flex items-center justify-center h-8 px-4 rounded-full text-xs font-bold transition-all
                    ${isFollowing 
                        ? 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-slate-600' 
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow'
                    }
                `}
            >
                {isLoading ? (
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                ) : isFollowing ? (
                    <>
                        <UserCheckIcon className="h-3.5 w-3.5 mr-1.5" />
                        Following
                    </>
                ) : (
                    <>
                        <UserPlusIcon className="h-3.5 w-3.5 mr-1.5" />
                        Follow
                    </>
                )}
            </button>
          )}
      </div>
    </div>
  );
};
