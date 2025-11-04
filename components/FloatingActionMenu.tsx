
import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { SirenIcon } from './icons/SirenIcon';
import { MemberUser } from '../types';

interface FloatingActionMenuProps {
  onNewPostClick: () => void;
  onDistressClick: () => void;
  user: MemberUser;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({ onNewPostClick, onDistressClick, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize off-screen then move to default to prevent initial flash
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isDragging, setIsDragging] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const savedPosition = localStorage.getItem('fabPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      // Default position, bottom right, adjusted for bottom nav bar
      setPosition({ x: window.innerWidth - 96, y: window.innerHeight - 250 });
    }
  }, []);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    hasMoved.current = false;
    setIsDragging(true);
    setIsOpen(false); // Close menu when starting to drag

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (fabRef.current) {
        const rect = fabRef.current.getBoundingClientRect();
        dragStartPos.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (!hasMoved.current) {
        const startX = position.x + dragStartPos.current.x;
        const startY = position.y + dragStartPos.current.y;
        const distance = Math.sqrt(Math.pow(clientX - startX, 2) + Math.pow(clientY - startY, 2));
        if (distance > 5) {
            hasMoved.current = true;
        } else {
            return; // Don't move if it's just a small jitter
        }
    }
    
    if ('preventDefault' in e) {
      e.preventDefault();
    }

    let newX = clientX - dragStartPos.current.x;
    let newY = clientY - dragStartPos.current.y;

    // Constrain within viewport with a 16px padding
    const fabWidth = fabRef.current?.offsetWidth || 64;
    const fabHeight = fabRef.current?.offsetHeight || 64;
    newX = Math.max(16, Math.min(newX, window.innerWidth - fabWidth - 16));
    newY = Math.max(16, Math.min(newY, window.innerHeight - fabHeight - 16));

    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (hasMoved.current) {
        localStorage.setItem('fabPosition', JSON.stringify(position));
      }
    }
  };

  const handleToggleMenu = () => {
    if (!hasMoved.current) {
      setIsOpen(prev => !prev);
    }
  };
  
  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const distressCallsAvailable = user.distress_calls_available;
  const subButtonStyle = "flex items-center justify-center h-14 w-14 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-110";

  return (
    <div
      ref={fabRef}
      className="fixed z-30 flex flex-col-reverse items-center gap-4"
      style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      {/* Main button */}
      <button
        onClick={handleToggleMenu}
        className="flex items-center justify-center h-16 w-16 rounded-full bg-slate-600 text-white shadow-lg hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-110"
        aria-expanded={isOpen}
        title={isOpen ? "Close menu" : "Open actions menu"}
      >
        <div className={`transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          <PlusIcon className="h-8 w-8" />
        </div>
      </button>
      
      {/* Sub-buttons container */}
      <div 
        className={`flex flex-col items-center gap-4 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div 
          className="relative flex flex-col items-center transition-transform duration-300"
          style={{ transform: isOpen ? 'translateY(0)' : 'translateY(20px)', transitionDelay: isOpen ? '50ms' : '0ms' }}
        >
           <button
              onClick={() => {
                onDistressClick();
                setIsOpen(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              disabled={distressCallsAvailable <= 0 || user.status !== 'active'}
              className={`${subButtonStyle} bg-red-600 hover:bg-red-700 disabled:bg-slate-500 disabled:cursor-not-allowed`}
              title={user.status !== 'active' ? "Account must be verified to use distress calls" : `Send Distress Call (${distressCallsAvailable} remaining)`}
          >
              <SirenIcon className="h-7 w-7"/>
          </button>
          <span className="mt-1 px-2 py-0.5 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none">Distress</span>
        </div>

         <div 
          className="relative flex flex-col items-center transition-transform duration-300"
          style={{ transform: isOpen ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <button
              onClick={() => {
                onNewPostClick();
                setIsOpen(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={`${subButtonStyle} bg-green-600 hover:bg-green-700`}
              title="Create a New Post"
          >
              <PlusIcon className="h-8 w-8"/>
          </button>
          <span className="mt-1 px-2 py-0.5 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none">New Post</span>
        </div>
      </div>
    </div>
  );
};
