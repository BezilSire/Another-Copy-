
import React, { useState } from 'react';
import { Post, User } from '../types';
import { formatTimeAgo } from '../utils';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { MessageCircleIcon } from './icons/MessageCircleIcon';
import { PinIcon } from './icons/PinIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';
import { MoreHorizontalIcon } from './icons/MoreHorizontalIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

const ModuleAction: React.FC<{ icon: React.ReactNode; count?: number; onClick: (e: React.MouseEvent) => void; isActive?: boolean; activeColor?: string; label: string }> = 
({ icon, count, onClick, isActive, activeColor = 'text-brand-gold', label }) => (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/5 ${isActive ? `${activeColor} bg-brand-gold/10` : 'text-gray-500'}`}>
        <span className="flex-shrink-0 opacity-80">{icon}</span>
        {count !== undefined && <span className="data-mono text-[10px] font-bold">{count}</span>}
        <span className="label-caps !text-[7px] !tracking-[0.2em]">{label}</span>
    </button>
);

export const PostItem: React.FC<{ 
    post: Post; 
    currentUser: User; 
    onUpvote: (postId: string) => void; 
    onDelete: (post: Post) => void; 
    onEdit: (post: Post) => void;
    onReport: (post: Post) => void;
    onViewProfile: (userId: string) => void;
    onRepost: (post: Post) => void;
    onShare: (post: Post) => void;
    onTogglePin: (post: Post) => void;
    isAdminView?: boolean;
}> = 
({ post, currentUser, onUpvote, onDelete, onEdit, onReport, onViewProfile, onRepost, onShare, onTogglePin, isAdminView }) => {
    const isOwnPost = post.authorId === currentUser.id;
    const hasUpvoted = post.upvotes.includes(currentUser.id);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="module-frame glass-module rounded-lg p-6 sm:p-8 transition-all hover:border-brand-gold/30 animate-fade-in group relative overflow-hidden">
            <div className="corner-tl opacity-20"></div><div className="corner-tr opacity-20"></div><div className="corner-bl opacity-20"></div><div className="corner-br opacity-20"></div>
            
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none data-mono text-[8px] uppercase">
                Block_Ref: {post.id.substring(0,12)}
            </div>
            
            <div className="flex gap-6 relative z-10">
                <button onClick={() => onViewProfile(post.authorId)} className="flex-shrink-0 pt-1">
                     <div className="w-14 h-14 rounded-lg bg-black flex items-center justify-center border border-white/10 group-hover:border-brand-gold/40 transition-all duration-700 shadow-2xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/10 to-transparent"></div>
                        {post.authorRole === 'admin' ? <LogoIcon className="h-8 w-8 text-brand-gold" /> : <UserCircleIcon className="h-10 w-10 text-gray-700 group-hover:text-brand-gold/60 transition-colors" />}
                     </div>
                </button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onViewProfile(post.authorId)} className="font-black text-white hover:text-brand-gold transition-colors truncate tracking-tighter uppercase text-sm">
                                    {post.authorName}
                                </button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3 w-3 text-blue-500" />}
                                {post.isPinned && <PinIcon className="h-3 w-3 text-brand-gold" />}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="label-caps !text-[7px] text-brand-gold/80">{post.authorCircle}</span>
                                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                <span className="label-caps !text-[7px]">{formatTimeAgo(post.date)}</span>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-700 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                                <MoreHorizontalIcon className="h-4 w-4" />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-12 w-48 bg-black border border-brand-gold/20 rounded-lg shadow-2xl z-50 py-2 backdrop-blur-3xl data-mono">
                                    {isOwnPost && <button onClick={() => {onEdit(post); setMenuOpen(false)}} className="w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-gold hover:bg-white/5 transition-all">Update_Entry</button>}
                                    {(isOwnPost || isAdminView) && <button onClick={() => {onDelete(post); setMenuOpen(false)}} className="w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-red-900 hover:text-red-500 hover:bg-red-500/5 transition-all">Revoke_Dispatch</button>}
                                    {!isOwnPost && <button onClick={() => {onReport(post); setMenuOpen(false)}} className="w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-yellow-900 hover:text-yellow-500 hover:bg-yellow-500/5 transition-all">Flag_Anomoly</button>}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-6 text-gray-400 text-sm leading-relaxed wysiwyg-content font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                        <MarkdownRenderer content={post.content} />
                    </div>

                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-1 sm:gap-4">
                            <ModuleAction 
                                icon={<ThumbsUpIcon className={`h-4 w-4 ${hasUpvoted ? 'fill-brand-gold text-brand-gold' : ''}`} />} 
                                count={post.upvotes.length} 
                                onClick={(e) => { e.stopPropagation(); onUpvote(post.id); }} 
                                isActive={hasUpvoted} 
                                activeColor="text-brand-gold"
                                label="Sync"
                            />
                            <ModuleAction 
                                icon={<MessageCircleIcon className="h-4 w-4" />} 
                                count={post.commentCount} 
                                onClick={(e) => { e.stopPropagation(); }} 
                                label="Comms"
                            />
                        </div>
                        <button onClick={() => onShare(post)} className="p-3 bg-white/5 hover:bg-brand-gold/20 rounded-lg text-gray-700 hover:text-brand-gold transition-all duration-500 border border-white/5">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
