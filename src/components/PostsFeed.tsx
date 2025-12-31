
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Post, User, Comment, Activity } from '../types';
import { DocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { formatTimeAgo } from '../utils';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { RepeatIcon } from './icons/RepeatIcon';
import { ShareIcon } from './icons/ShareIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UsersIcon } from './icons/UsersIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';
// Added missing AlertTriangleIcon import
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { SirenIcon } from './icons/SirenIcon';
import { PinIcon } from './icons/PinIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SendIcon } from './icons/SendIcon';
import { EditPostModal } from './EditPostModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { RepostModal } from './RepostModal';

interface PostsFeedProps {
  user: User;
  onViewProfile: (userId: string) => void;
  feedType?: 'all' | 'circle';
  authorId?: string;
  isAdminView?: boolean;
  typeFilter?: string;
}

const CommentItem: React.FC<{
    comment: Comment;
    onDelete: (commentId: string) => void;
    onUpvote: (commentId: string) => void;
    currentUser: User;
}> = ({ comment, onDelete, onUpvote, currentUser }) => {
    const isOwnComment = currentUser.id === comment.authorId;
    const hasUpvoted = comment.upvotes.includes(currentUser.id);

    return (
        <div className="flex items-start space-x-3 py-4 animate-fade-in group/comment">
            <UserCircleIcon className="h-8 w-8 text-gray-700 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
                <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/5 group-hover/comment:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-1">
                         <span className="font-black text-[10px] text-white uppercase tracking-tight">{comment.authorName}</span>
                        <p className="text-[8px] text-gray-500 font-bold uppercase">{comment.timestamp ? formatTimeAgo(comment.timestamp.toDate().toISOString()) : 'sending...'}</p>
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed break-words">
                        <MarkdownRenderer content={comment.content} />
                    </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 pl-2">
                    <button onClick={() => onUpvote(comment.id)} className={`flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${hasUpvoted ? 'text-brand-gold' : 'text-gray-500 hover:text-white'}`}>
                        <ThumbsUpIcon className="h-3 w-3" />
                        <span>{comment.upvotes.length || 'Vouch'}</span>
                    </button>
                    {isOwnComment && (
                         <button onClick={() => onDelete(comment.id)} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-red-500 transition-colors">Purge</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CommentSection: React.FC<{ parentId: string, currentUser: User }> = ({ parentId, currentUser }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubscribe = api.listenForComments(parentId, setComments, 'posts', (error) => {
            addToast("Could not load comments.", "error");
        });
        return () => unsubscribe();
    }, [parentId, addToast]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        const commentData: Omit<Comment, 'id' | 'timestamp'> = {
            parentId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            content: newComment,
            upvotes: [],
        };
        try {
            await api.addComment(parentId, commentData, 'posts');
            setNewComment('');
        } catch (error) {
            addToast("Failed to post comment.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteComment = async (commentId: string) => {
        if(window.confirm("Are you sure you want to delete this comment?")) {
            await api.deleteComment(parentId, commentId, 'posts');
        }
    };
    
    const handleUpvoteComment = async (commentId: string) => {
        await api.upvoteComment(parentId, commentId, currentUser.id, 'posts');
    };

    return (
        <div className="pt-8 mt-6 border-t border-white/5 animate-fade-in">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 pl-2">Protocol Discussion ({comments.length})</h3>
            <div className="space-y-2 mb-8">
                {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} currentUser={currentUser} onDelete={handleDeleteComment} onUpvote={handleUpvoteComment} />
                ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 bg-black/40 p-2 rounded-[1.8rem] border border-white/10 group focus-within:border-brand-gold/40 transition-all">
                <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 text-gray-600"><UserCircleIcon className="h-5 w-5"/></div>
                <input 
                    type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Contribute to the thread..."
                    className="flex-1 bg-transparent border-none py-3 text-white text-sm focus:outline-none placeholder-gray-800"
                />
                <button type="submit" disabled={isSubmitting || !newComment.trim()} className="p-4 rounded-2xl text-slate-950 bg-brand-gold hover:bg-brand-gold-light shadow-glow-gold disabled:opacity-20 active:scale-90 transition-all">
                    {isSubmitting ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <SendIcon className="h-4 w-4"/>}
                </button>
            </form>
        </div>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: () => void; isActive?: boolean; activeColor?: string; label?: string; }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', label }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center space-x-3 py-3 rounded-2xl transition-all duration-300 cursor-pointer ${isActive ? `${activeColor} bg-white/5 shadow-inner` : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}>
        {icon}
        {count !== undefined && count > 0 && <span className="text-[11px] font-black font-mono">{count}</span>}
        {label && <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">{label}</span>}
    </button>
);

export const PostItem: React.FC<{ 
    post: Post; 
    currentUser: User; 
    onUpvote: (postId: string) => void; 
    onViewProfile: (userId: string) => void;
    onRepost: (post: Post) => void;
    onShare: (post: Post) => void;
    onDelete: (postId: string) => void;
    onEdit: (post: Post) => void;
}> = 
({ post, currentUser, onUpvote, onViewProfile, onRepost, onShare, onDelete, onEdit }) => {
    const hasUpvoted = post.upvotes.includes(currentUser.id);
    const isAuthor = post.authorId === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    const [showComments, setShowComments] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsTruncation, setNeedsTruncation] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (contentRef.current) {
            const isOverflowing = contentRef.current.scrollHeight > 168;
            setNeedsTruncation(isOverflowing);
        }
    }, [post.content]);

    const typeStyles: Record<string, { icon: React.ReactNode; borderColor: string; badgeClasses: string; title: string }> = {
        proposal: { icon: <LightbulbIcon className="h-3 w-3" />, borderColor: 'border-blue-500/50', badgeClasses: 'bg-blue-500/20 text-blue-400 border-blue-500/30', title: 'Proposal' },
        offer: { icon: <UsersIcon className="h-3 w-3" />, borderColor: 'border-purple-500/50', badgeClasses: 'bg-purple-500/20 text-purple-400 border-purple-500/30', title: 'Offer' },
        opportunity: { icon: <BriefcaseIcon className="h-3 w-3" />, borderColor: 'border-emerald-500/50', badgeClasses: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', title: 'Work' },
        distress: { icon: <SirenIcon className="h-3 w-3" />, borderColor: 'border-red-500/50', badgeClasses: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse', title: 'Distress' },
        general: { icon: <MessageSquareIcon className="h-3 w-3" />, borderColor: 'border-slate-700', badgeClasses: 'bg-white/5 text-gray-500 border-white/10', title: 'Update' },
    };
    const typeInfo = typeStyles[post.types] || typeStyles['general'];

    return (
        <div className={`bg-slate-900/40 p-6 sm:p-8 rounded-[3rem] shadow-premium border border-white/5 border-l-4 ${typeInfo.borderColor} transition-all duration-500 group relative`}>
            
            {(isAuthor || isAdmin) && (
                <div className="absolute top-6 right-6 flex gap-2 z-20">
                    {isAuthor && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(post); }} 
                            className="p-2.5 bg-brand-gold text-slate-950 hover:bg-white rounded-xl shadow-glow-gold transition-all" 
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
                        className="p-2.5 bg-red-600 text-white hover:bg-red-500 rounded-xl shadow-lg transition-all" 
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )}

            {post.isPinned && <div className="flex items-center space-x-1 text-xs text-brand-gold mb-6 font-black uppercase tracking-widest"><PinIcon className="h-3 w-3"/><span>Pinned dispatch</span></div>}
            
            <div className="flex items-start space-x-5">
                <button onClick={() => onViewProfile(post.authorId)} className="shrink-0 transition-transform active:scale-90">
                     {post.authorRole === 'admin' ? <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 flex items-center justify-center shadow-glow-gold"><LogoIcon className="h-7 w-7 text-brand-gold" /></div> : <div className="w-12 h-12 bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner"><UserCircleIcon className="h-8 w-8 text-gray-700" /></div>}
                </button>
                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap pr-20">
                        <button onClick={() => onViewProfile(post.authorId)} className="font-black text-white hover:text-brand-gold uppercase tracking-tight text-sm truncate">{post.authorName}</button>
                        {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-500"/>}
                        <span className={`px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase tracking-[0.2em] flex items-center gap-1 ${typeInfo.badgeClasses}`}>
                            {typeInfo.icon} {typeInfo.title}
                        </span>
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                </div>
            </div>
            
            <div className="mt-8 relative">
                <div 
                    ref={contentRef}
                    className={`transition-all duration-700 ease-in-out relative overflow-hidden ${!isExpanded && needsTruncation ? 'max-h-[10.5rem] line-clamp-[7]' : 'max-h-none'}`}
                    style={!isExpanded && needsTruncation ? {
                        display: '-webkit-box',
                        WebkitLineClamp: 7,
                        WebkitBoxOrient: 'vertical',
                    } : {}}
                >
                    <div className="text-slate-200 text-[15px] leading-relaxed wysiwyg-content opacity-90 font-medium">
                        <MarkdownRenderer content={post.content} />
                    </div>
                    
                    {needsTruncation && !isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10"></div>
                    )}
                </div>

                {needsTruncation && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="mt-6 w-full sm:w-auto text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 hover:border-brand-gold/30 shadow-inner active:scale-95"
                    >
                        <span>{isExpanded ? '[ COLLAPSE_DISPATCH ]' : '[ READ_FULL_DISPATCH... ]'}</span>
                        <ArrowRightIcon className={`h-3 w-3 transition-transform duration-500 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                )}
            </div>

            <div className="mt-10 flex justify-around items-center text-gray-500 border-t border-white/5 pt-4 gap-2">
                <ActionButton icon={<ThumbsUpIcon className="h-5 w-5"/>} count={post.upvotes.length} onClick={() => onUpvote(post.id)} isActive={hasUpvoted} activeColor="text-brand-gold" label="Like" />
                <ActionButton icon={<MessageSquareIcon className="h-5 w-5"/>} count={post.commentCount} onClick={() => setShowComments(!showComments)} isActive={showComments} activeColor="text-blue-400" label="Comms" />
                <ActionButton icon={<RepeatIcon className="h-5 w-5"/>} count={post.repostCount} onClick={() => onRepost(post)} label="Repost" />
                <ActionButton icon={<ShareIcon className="h-5 w-5"/>} onClick={() => onShare(post)} label="Share" />
            </div>

            {showComments && <CommentSection parentId={post.id} currentUser={currentUser} />}
        </div>
    );
};

export const PostsFeed: React.FC<PostsFeedProps> = ({ user, onViewProfile, authorId, isAdminView = false }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [repostingPost, setRepostingPost] = useState<Post | null>(null);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const { addToast } = useToast();
    
    const [hasLastVisible, setHasLastVisible] = useState(false);
    const lastVisibleRef = useRef<DocumentSnapshot<DocumentData> | null>(null);

    const loadPosts = useCallback(async (loadMore = false) => {
        if (authorId) return;
        
        const isInitial = !loadMore;
        if (isInitial) {
            setIsLoading(true);
            setPosts([]);
            lastVisibleRef.current = null;
            setHasLastVisible(false);
        }

        try {
            const { posts: newPosts, lastVisible: nextDoc } = await api.fetchRegularPosts(
                15, 
                'all', 
                isAdminView, 
                loadMore ? (lastVisibleRef.current || undefined) : undefined, 
                user
            );
            
            lastVisibleRef.current = nextDoc;
            setHasLastVisible(!!nextDoc);
            setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);
        } catch (err: any) {
            setError("Handshake unstable. Ledger index not established.");
        } finally {
            setIsLoading(false);
        }
    }, [authorId, isAdminView, user]);

    useEffect(() => { loadPosts(false); }, [loadPosts]);

    useEffect(() => {
        if (!authorId) return;
        setIsLoading(true);
        const unsubscribe = api.listenForPostsByAuthor(authorId, (userPosts) => {
            setPosts(userPosts);
            setIsLoading(false);
        }, (err) => {
            setError("Identity activity stream unavailable.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [authorId]);

    const handleUpvote = useCallback(async (postId: string) => {
        try {
            await api.upvotePost(postId, user.id);
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes.includes(user.id) ? p.upvotes.filter(id => id !== user.id) : [...p.upvotes, user.id] } : p));
        } catch (error) { addToast('Protocol signature failed.', 'error'); }
    }, [user.id, addToast]);

    const handleShare = (post: Post) => {
        const link = `${window.location.origin}/post/${post.id}`;
        if (navigator.share) {
            navigator.share({
                title: 'Ubuntium Protocol Dispatch',
                text: `${post.authorName}'s dispatch on the Global Commons: ${post.content.substring(0, 100)}...`,
                url: link
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(link);
            addToast("Link copied to node buffer.", "info");
        }
    };

    const handleConfirmDelete = async () => {
        if (!postToDelete) return;
        try {
            await api.deletePost(postToDelete);
            setPosts(prev => prev.filter(p => p.id !== postToDelete));
            addToast("Dispatch Purged Successfully.", "info");
        } catch (e) {
            addToast("Purge sequence failed.", "error");
        } finally {
            setPostToDelete(null);
        }
    };

    const handleUpdatePost = async (postId: string, content: string) => {
        try {
            await api.updatePost(postId, content);
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
            setEditingPost(null);
            addToast("Dispatch Refined Successfully.", "success");
        } catch (e) {
            addToast("Refining sequence failed.", "error");
        }
    };

    const handleRepostFinal = async (originalPost: Post, comment: string) => {
        try {
            await api.repostPost(originalPost, user, comment);
            addToast("Dispatch Amplified.", "success");
            setRepostingPost(null);
            loadPosts(false);
        } catch (e) {
            addToast("Repost failed.", "error");
        }
    };

    if (isLoading && posts.length === 0) return (
        <div className="text-center p-20">
            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50 mx-auto" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em] mt-6">Syncing_Mainline_Stream</p>
        </div>
    );
    
    if (error) return (
        <div className="text-center p-20 bg-slate-900/60 rounded-[3rem] border border-red-500/20 shadow-premium">
            <AlertTriangleIcon className="h-10 w-10 mx-auto text-red-500 mb-6 opacity-40" />
            <p className="text-red-400 font-black uppercase tracking-widest text-[11px] mb-3">Sync Anomaly Detected</p>
            <p className="text-gray-500 text-[10px] leading-relaxed max-w-xs mx-auto uppercase tracking-widest">{error}</p>
            <button onClick={() => loadPosts(false)} className="mt-10 px-10 py-4 bg-white/5 text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">Reset Handshake</button>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {editingPost && <EditPostModal isOpen={!!editingPost} onClose={() => setEditingPost(null)} post={editingPost} onSave={handleUpdatePost} />}
            {repostingPost && <RepostModal isOpen={!!repostingPost} onClose={() => setRepostingPost(null)} post={repostingPost} currentUser={user} onRepost={handleRepostFinal} />}

            <ConfirmationDialog 
                isOpen={!!postToDelete}
                onClose={() => setPostToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Purge Dispatch"
                message="Are you sure you want to permanently delete this dispatch? This action is immutable on the global ledger."
                confirmButtonText="Purge"
            />

            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-matrix animate-pulse"></div>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Oracle_Mainline</span>
                </div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest font-mono">Synced: {posts.length} Blocks</span>
            </div>

            {posts.map(post => (
                <PostItem 
                    key={post.id} 
                    post={post} 
                    currentUser={user} 
                    onUpvote={handleUpvote} 
                    onViewProfile={onViewProfile} 
                    onRepost={setRepostingPost} 
                    onShare={handleShare} 
                    onDelete={setPostToDelete}
                    onEdit={setEditingPost}
                />
            ))}
            
            {!authorId && hasLastVisible && (
                <div className="pt-10 text-center">
                    <button 
                        onClick={() => loadPosts(true)}
                        className="px-12 py-5 bg-slate-950 border border-white/5 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white hover:border-brand-gold/30 transition-all shadow-xl active:scale-95 cursor-pointer"
                    >
                        Index More Blocks
                    </button>
                </div>
            )}
        </div>
    );
};
