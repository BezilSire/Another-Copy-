
import React, { useState } from 'react';
import { Post, User } from '../types';
import { formatTimeAgo } from '../utils';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { MessageCircleIcon } from './icons/MessageSquareIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

export const PostItem: React.FC<{ 
    post: Post; 
    currentUser: User; 
    onUpvote: (postId: string) => void; 
    onDelete: (post: Post) => void; 
    onViewProfile: (userId: string) => void;
    onShare: (post: Post) => void;
}> = 
({ post, currentUser, onUpvote, onViewProfile, onShare }) => {
    const hasUpvoted = post.upvotes.includes(currentUser.id);
    const [isExpanded, setIsExpanded] = useState(false);
    const needsTruncation = post.content.length > 120 || post.content.includes('</p><p>') || post.content.includes('<br>');

    return (
        <div className="glass-card rounded-[2rem] p-6 transition-all duration-300 hover:border-gold/20 animate-fade-in group relative overflow-hidden">
            <div className="flex gap-4">
                <button onClick={() => onViewProfile(post.authorId)} className="flex-shrink-0">
                     <div className="w-12 h-12 rounded-xl bg-obsidian border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                        <UserCircleIcon className="h-8 w-8 text-gray-600 group-hover:text-gold transition-colors" />
                     </div>
                </button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onViewProfile(post.authorId)} className="font-bold text-white uppercase tracking-tight text-sm">
                                    {post.authorName}
                                </button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-500" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <span>{post.authorCircle}</span>
                                <span className="opacity-30">&bull;</span>
                                <span>{formatTimeAgo(post.date)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 relative">
                        <div 
                            className={`text-gray-200 text-sm leading-relaxed wysiwyg-content font-medium opacity-90 transition-all duration-500 ease-in-out relative overflow-hidden ${!isExpanded && needsTruncation ? 'max-h-[4.5rem]' : 'max-h-[5000px]'}`}
                        >
                            <MarkdownRenderer content={post.content} />
                            {!isExpanded && needsTruncation && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent pointer-events-none"></div>
                            )}
                        </div>

                        {needsTruncation && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                className="mt-4 text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-[0.3em] transition-all flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                            >
                                <span>{isExpanded ? '[ COLLAPSE DISPATCH ]' : '[ READ FULL DISPATCH... ]'}</span>
                                <ArrowRightIcon className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5">
                        <button 
                            onClick={() => onUpvote(post.id)} 
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${hasUpvoted ? 'text-gold' : 'text-gray-500 hover:text-white'}`}
                        >
                            <ThumbsUpIcon className="h-4 w-4" /> {post.upvotes.length}
                        </button>
                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                            <MessageCircleIcon className="h-4 w-4" /> {post.commentCount || 0}
                        </button>
                        <button onClick={() => onShare(post)} className="ml-auto text-gray-600 hover:text-gold transition-colors">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
