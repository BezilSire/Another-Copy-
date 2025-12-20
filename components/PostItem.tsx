
import React, { useState, useMemo } from 'react';
import { Post, User, Comment } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { formatTimeAgo } from '../utils';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { EditPostModal } from './EditPostModal';
import { FlagIcon } from './icons/FlagIcon';
import { ReportPostModal } from './ReportPostModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SirenIcon } from './icons/SirenIcon';
import { RepeatIcon } from './icons/RepeatIcon';
import { ShareIcon } from './icons/ShareIcon';
import { RepostModal } from './RepostModal';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UsersIcon } from './icons/UsersIcon';
import { MessageCircleIcon } from './icons/MessageCircleIcon';
import { SendIcon } from './icons/SendIcon';
import { PinIcon } from './icons/PinIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';
import { MoreHorizontalIcon } from './icons/MoreHorizontalIcon';

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: (e: React.MouseEvent) => void; isActive?: boolean; activeColor?: string; label: string }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', label }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-white/5 ${isActive ? activeColor : 'text-gray-500'}`}>
        <span className="flex-shrink-0">{icon}</span>
        {count !== undefined && <span className="text-xs font-bold font-mono">{count}</span>}
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
    const isDistressPost = post.types === 'distress';
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 sm:p-6 transition-all hover:bg-slate-900/60 animate-fade-in">
            <div className="flex gap-4">
                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} className="flex-shrink-0 pt-1">
                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center border border-white/10 group overflow-hidden">
                        {post.authorRole === 'admin' ? <LogoIcon className="h-7 w-7 text-brand-gold animate-float" /> : <UserCircleIcon className="h-8 w-8 text-gray-600 group-hover:text-white transition-colors" />}
                     </div>
                </button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} className="font-black text-white hover:text-brand-gold transition-colors truncate">
                                    {post.authorName}
                                </button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-400" />}
                                {post.isPinned && <PinIcon className="h-3 w-3 text-brand-gold/70" />}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <span>{post.authorCircle}</span>
                                <span>&bull;</span>
                                <span>{formatTimeAgo(post.date)}</span>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-600 hover:text-white transition-colors">
                                <MoreHorizontalIcon className="h-5 w-5" />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-10 w-40 glass-card rounded-2xl shadow-premium z-20 py-2 border border-white/10 overflow-hidden">
                                    {isOwnPost && <button onClick={() => {onEdit(post); setMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">Edit Plan</button>}
                                    {(isOwnPost || isAdminView) && <button onClick={() => {onDelete(post); setMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors">Delete Entry</button>}
                                    {!isOwnPost && <button onClick={() => {onReport(post); setMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-yellow-500 hover:bg-white/5 transition-colors">Flag Entry</button>}
                                    {isAdminView && <button onClick={() => {onTogglePin(post); setMenuOpen(false)}} className="w-full text-left px-4 py-2 text-sm text-brand-gold-light hover:bg-white/5 transition-colors">{post.isPinned ? 'Unpin' : 'Pin to Top'}</button>}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-4 text-slate-200 text-base leading-relaxed wysiwyg-content">
                        <MarkdownRenderer content={post.content} />
                    </div>

                    {post.repostedFrom && (
                         <div className="mt-4 p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                <UserCircleIcon className="h-4 w-4" />
                                <span className="text-gray-400">{post.repostedFrom.authorName}</span>
                            </div>
                            <div className="text-gray-400 text-sm line-clamp-3">
                                 <MarkdownRenderer content={post.repostedFrom.content} />
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-6 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1 sm:gap-4">
                            <ActionButton 
                                icon={<ThumbsUpIcon className={`h-5 w-5 ${hasUpvoted ? 'fill-current' : ''}`} />} 
                                count={post.upvotes.length} 
                                onClick={(e) => { e.stopPropagation(); onUpvote(post.id); }} 
                                isActive={hasUpvoted} 
                                activeColor="text-pink-500 shadow-glow-pink"
                                label="Like"
                            />
                            <ActionButton 
                                icon={<MessageCircleIcon className="h-5 w-5" />} 
                                count={post.commentCount} 
                                onClick={(e) => { e.stopPropagation(); }} 
                                label="Comment"
                            />
                            <ActionButton 
                                icon={<RepeatIcon className="h-5 w-5" />} 
                                count={post.repostCount} 
                                onClick={(e) => { e.stopPropagation(); onRepost(post); }} 
                                label="Repost"
                            />
                        </div>
                        <button onClick={() => onShare(post)} className="p-2 text-gray-500 hover:text-blue-400 transition-colors">
                            <ShareIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
