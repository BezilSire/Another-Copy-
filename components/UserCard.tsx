import React from 'react';
import { User, PublicUserProfile } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';

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

  return (
    <div
      onClick={onClick}
      className="w-full h-full text-left bg-slate-800 p-4 rounded-lg shadow-md hover:bg-slate-700/50 hover:ring-2 hover:ring-green-500 transition-all duration-200 cursor-pointer flex flex-col justify-center min-h-[110px]"
    >
      <div className="flex items-center space-x-4">
        <div className="relative flex-shrink-0">
          <UserCircleIcon className="h-12 w-12 text-gray-400" />
          {isOnline && (
            <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-slate-800" title="Online"></span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <p className="font-bold text-white truncate">{user.name}</p>
            <StatusBadge status={user.status} />
          </div>
          <p className="text-sm text-gray-400 truncate">{user.circle}</p>
        </div>
      </div>
    </div>
  );
};