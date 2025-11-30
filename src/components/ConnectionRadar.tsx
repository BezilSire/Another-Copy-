
import React, { useState, useEffect, useRef } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface ConnectionRadarProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onStartChat: (targetUserId: string) => void;
}

export const ConnectionRadar: React.FC<ConnectionRadarProps> = ({ currentUser, onViewProfile, onStartChat }) => {
  const [nearbyUsers, setNearbyUsers] = useState<PublicUserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        // Fetch a pool of users (using venture members as a proxy for active community members)
        const { users } = await api.getVentureMembers(50); 
        
        if (!isMounted) return;

        // Filter out self
        const others = users.filter(u => u.id !== currentUser.id);
        
        // Sort: Users in same circle (city) first, then random
        const sorted = others.sort((a, b) => {
            const aIsLocal = a.circle === currentUser.circle ? 1 : 0;
            const bIsLocal = b.circle === currentUser.circle ? 1 : 0;
            return bIsLocal - aIsLocal;
        });

        // Take top 12 to display on radar
        setNearbyUsers(sorted.slice(0, 12));
      } catch (error) {
        console.error("Failed to load radar users", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUsers();
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleUserClick = (user: PublicUserProfile) => {
    setSelectedUser(user);
  };

  const closeSelection = () => {
    setSelectedUser(null);
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full bg-slate-900 rounded-xl border border-slate-700">
              <div className="text-center">
                  <LoaderIcon className="h-10 w-10 text-green-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Scanning for connections...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center isolate" ref={containerRef}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ 
               backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Radar Rings */}
      <div className="absolute w-[30%] h-[30%] border border-green-500/20 rounded-full z-0 min-w-[100px] min-h-[100px]"></div>
      <div className="absolute w-[60%] h-[60%] border border-green-500/20 rounded-full z-0 min-w-[200px] min-h-[200px]"></div>
      <div className="absolute w-[90%] h-[90%] border border-green-500/10 rounded-full z-0 min-w-[300px] min-h-[300px]"></div>

      {/* Scanning Animation */}
      <div className="absolute w-[90%] h-[90%] rounded-full z-0 animate-spin-slow pointer-events-none bg-gradient-conic from-green-500/10 via-transparent to-transparent min-w-[300px] min-h-[300px]"></div>

      {/* Center: Current User */}
      <div className="absolute z-20 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] flex items-center justify-center relative">
            <UserCircleIcon className="h-10 w-10 text-white" />
            <div className="absolute -bottom-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <span className="mt-2 text-xs font-bold text-green-400 bg-slate-900/80 px-2 py-0.5 rounded-full">YOU</span>
      </div>

      {/* Nearby Users Nodes */}
      {nearbyUsers.map((user, index) => {
        // Distribute on two rings: index 0-5 on inner ring, 6+ on outer
        const isInner = index < 6;
        const radius = isInner ? 28 : 42; // Percentage radius
        const offsetIndex = isInner ? index : index - 6;
        const totalInRing = isInner ? 6 : Math.max(1, nearbyUsers.length - 6);
        
        // Add a slight random offset to angle so it looks organic
        const randomOffset = (index % 2 === 0 ? 1 : -1) * (Math.random() * 0.2); 
        const angle = (offsetIndex / totalInRing) * 2 * Math.PI + randomOffset;
        
        // Use percentage translation to be responsive
        const x = Math.cos(angle) * radius * 3; // Multiplier to spread them out
        const y = Math.sin(angle) * radius * 3;

        const isLocal = user.circle === currentUser.circle;

        return (
          <button
            key={user.id}
            onClick={() => handleUserClick(user)}
            className={`absolute z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-125 focus:outline-none ring-2 ring-offset-2 ring-offset-slate-900 ${selectedUser?.id === user.id ? 'bg-green-500 ring-white scale-125' : 'bg-slate-700 ring-slate-600 hover:bg-slate-600'}`}
            style={{ 
                transform: `translate(${x}px, ${y}px)`,
                left: `calc(50% + ${Math.cos(angle) * radius}%)`,
                top: `calc(50% + ${Math.sin(angle) * radius}%)`,
                marginTop: '-1.25rem', // Half of width/height to center
                marginLeft: '-1.25rem'
            }}
            title={user.name}
          >
            <span className="text-xs font-bold text-white">
                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
            {isLocal && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" title="Same Circle"></span>
            )}
          </button>
        );
      })}

      {/* Selected User Overlay */}
      {selectedUser && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600 p-4 rounded-xl shadow-2xl z-30 animate-fade-in flex flex-col sm:flex-row items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-slate-700 p-2 rounded-full">
                    <UserCircleIcon className="h-10 w-10 text-gray-300" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white text-lg leading-tight">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-400">{selectedUser.circle}</p>
                    {selectedUser.profession && <p className="text-xs text-green-400 mt-0.5">{selectedUser.profession}</p>}
                </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => { onStartChat(selectedUser.id); closeSelection(); }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    <MessageSquareIcon className="h-4 w-4" />
                    Chat
                </button>
                <button 
                    onClick={() => { onViewProfile(selectedUser.id); closeSelection(); }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    Profile
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
                <button 
                    onClick={closeSelection}
                    className="px-3 py-2 text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur px-2 py-1 rounded-md">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-[10px] text-gray-400">You</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur px-2 py-1 rounded-md">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-[10px] text-gray-400">Local (Your Circle)</span>
          </div>
      </div>

    </div>
  );
};
