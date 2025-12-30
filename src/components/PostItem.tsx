import React, { useState, useRef, useLayoutEffect } from 'react';
import { Post, User } from '../types';
import { formatTimeAgo } from '../utils';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

export const PostItem: React.FC<{ 
    post: Post; 
    currentUser: User; 
    onUpvote: (postId: string) => void; 
    onDelete: (postId: string) => void; 
    onEdit: (post: Post) => void;
    onViewProfile: (userId: string) => void;
    onShare: (post: Post) => void;
}> = 
({ post, currentUser, onUpvote, onDelete, onEdit, onViewProfile, onShare }) => {
    const hasUpvoted = post.upvotes.includes(currentUser.id);
    const isAuthor = post.authorId === currentUser.id;
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsTruncation, setNeedsTruncation] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (contentRef.current) {
            // Measure content against 7 lines (approx 168px)
            const isOverflowing = contentRef.current.scrollHeight > 168;
            setNeedsTruncation(isOverflowing);
        }
    }, [post.content]);

    return (
        <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 hover:border-gold/20 animate-fade-in group relative overflow-hidden">
             {/* SOVEREIGN AUTHORITY ACTIONS - PERMANENT VISIBILITY */}
            {isAuthor && (
                <div className="absolute top-4 right-6 flex gap-2 z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(post); }} 
                        className="p-2 bg-brand-gold text-slate-950 hover:bg-white rounded-xl shadow-glow-gold transition-all"
                        title="Refine Dispatch"
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
                        className="p-2 bg-red-600 text-white hover:bg-red-500 rounded-xl shadow-lg transition-all"
                        title="Purge Dispatch"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="flex gap-4">
                <button onClick={() => onViewProfile(post.authorId)} className="flex-shrink-0">
                     <div className="w-12 h-12 rounded-2xl bg-obsidian border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                        <UserCircleIcon className="h-8 w-8 text-gray-600 group-hover:text-gold transition-colors" />
                     </div>
                </button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start pr-20">
                        <div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onViewProfile(post.authorId)} className="font-black text-white uppercase tracking-tight text-xs hover:text-brand-gold transition-colors">
                                    {post.authorName}
                                </button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3 w-3 text-blue-500" />}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                <span>{post.authorCircle}</span>
                                <span className="opacity-30">&bull;</span>
                                <span>{formatTimeAgo(post.date)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 relative">
                         {/* 7-LINE ISOLATION CONTAINER */}
                         <div 
                            ref={contentRef}
                            className={`transition-all duration-700 ease-in-out relative overflow-hidden ${!isExpanded && needsTruncation ? 'max-h-[10.5rem] line-clamp-[7]' : 'max-h-none'}`}
                            style={!isExpanded && needsTruncation ? {
                                display: '-webkit-box',
                                WebkitLineClamp: 7,
                                WebkitBoxOrient: 'vertical',
                            } : {}}
                        >
                            <div className="text-gray-200 text-sm leading-relaxed wysiwyg-content opacity-90 font-medium">
                                <MarkdownRenderer content={post.content} />
                            </div>
                            
                            {needsTruncation && !isExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10"></div>
                            )}
                        </div>

                        {needsTruncation && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                className="mt-6 w-full sm:w-auto text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 bg-white/5 px-5 py-2.5 rounded-xl border border-white/5 hover:border-brand-gold/30 shadow-inner"
                            >
                                <span>{isExpanded ? '[ COLLAPSE_TRANSMISSION ]' : '[ READ_FULL_DISPATCH... ]'}</span>
                                <ArrowRightIcon className={`h-3 w-3 transition-transform duration-500 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-around mt-10 pt-4 border-t border-white/5">
                        <button 
                            onClick={() => onUpvote(post.id)} 
                            className={`flex flex-1 items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all py-2 rounded-xl hover:bg-white/5 ${hasUpvoted ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            <ThumbsUpIcon className="h-4 w-4" /> {post.upvotes.length}
                        </button>
                        <button className="flex flex-1 items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-blue-400 hover:bg-white/5 transition-all py-2 rounded-xl">
                            <MessageSquareIcon className="h-4 w-4" /> {post.commentCount || 0}
                        </button>
                        <button onClick={() => onShare(post)} className="flex flex-1 items-center justify-center text-gray-600 hover:text-brand-gold hover:bg-white/5 transition-all py-2 rounded-xl">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};