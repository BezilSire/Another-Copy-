import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Post, User, Comment, Activity, PublicUserProfile, FilterType } from '../types';
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
import { Timestamp, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { PinIcon } from './icons/PinIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ActivityItem } from './ActivityItem';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';

// FIX: Added missing PostsFeedProps interface and moved before component definition
interface PostsFeedProps {
  user: User;
  onViewProfile: (userId: string) => void;
  feedType?: 'all' | 'circle';
  authorId?: string;
  isAdminView?: boolean;
  typeFilter?: FilterType;
}

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: () => void; isActive?: boolean; activeColor?: string; title?: string; }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', title }) => (
    <button onClick={onClick} title={title} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors duration-200 ${isActive ? `${activeColor} bg-slate-700/50` : 'hover:bg-slate-700/50'}`}>
        {icon}
        {count !== undefined && count > 0 && <span className="text-sm font-semibold">{count}</span>}
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
    const isAdminPost = post.authorRole === 'admin';
    const [showComments, setShowComments] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const typeStyles: Record<string, { icon: React.ReactNode; borderColor: string; title: string }> = {
        proposal: { icon: <LightbulbIcon className="h-4 w-4 text-blue-300" />, borderColor: 'border-blue-500/50', title: 'Proposal' },
        offer: { icon: <UsersIcon className="h-4 w-4 text-purple-300" />, borderColor: 'border-purple-500/50', title: 'Offer' },
        opportunity: { icon: <BriefcaseIcon className="h-4 w-4 text-green-300" />, borderColor: 'border-green-500/50', title: 'Opportunity' },
        distress: { icon: <SirenIcon className="h-4 w-4 text-red-400" />, borderColor: 'border-red-500/50', title: 'Distress Call' },
        general: { icon: <MessageCircleIcon className="h-4 w-4 text-slate-400" />, borderColor: 'border-slate-700', title: 'General Post' },
    };
    const typeInfo = typeStyles[post.types] || typeStyles['general'];

    return (
        <div className={`bg-slate-800 p-6 rounded-lg shadow-lg border-l-4 ${typeInfo.borderColor} transition-all duration-300 animate-fade-in`}>
            {post.isPinned && <div className="flex items-center space-x-1 text-xs text-brand-gold mb-2 font-black uppercase tracking-widest"><PinIcon className="h-4 w-4"/><span>Pinned Entry</span></div>}
            <div className="flex items-start space-x-4">
                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} disabled={isDistressPost}>
                     {isAdminPost ? <LogoIcon className="h-10 w-10 text-brand-gold" /> : <UserCircleIcon className="h-10 w-10 text-gray-400" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} className="font-bold text-white hover:text-brand-gold truncate" disabled={isDistressPost}>{post.authorName}</button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-4 w-4 text-blue-400"/>}
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className={`text-slate-200 mt-4 text-sm leading-relaxed wysiwyg-content ${!isExpanded ? 'line-clamp-6' : ''}`}>
                <MarkdownRenderer content={post.content} />
            </div>

            <div className="mt-6 flex justify-around items-center text-gray-400 border-t border-slate-700/50 pt-2">
                <ActionButton icon={<ThumbsUpIcon className="h-5 w-5"/>} count={post.upvotes.length} onClick={() => onUpvote(post.id)} isActive={hasUpvoted} activeColor="text-brand-gold" label="Like" />
                <ActionButton icon={<MessageCircleIcon className="h-5 w-5"/>} count={post.commentCount} onClick={() => setShowComments(!showComments)} isActive={showComments} activeColor="text-blue-400" label="Comment" />
                <ActionButton icon={<RepeatIcon className="h-5 w-5"/>} count={post.repostCount} onClick={() => onRepost(post)} label="Repost" />
                <ActionButton icon={<ShareIcon className="h-5 w-5"/>} onClick={() => onShare(post)} label="Share" />
            </div>
        </div>
    );
};

// FIX: Consolidating and cleaning up the duplicate PostsFeed definition
export const PostsFeed: React.FC<PostsFeedProps> = ({ user, onViewProfile, feedType = 'all', authorId, isAdminView = false, typeFilter = 'all' }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);

    const loadPosts = useCallback(async (loadMore = false) => {
        if (authorId) return;
        setIsLoading(true);
        setError(null);
        try {
            if (!loadMore) {
                const pinned = await api.fetchPinnedPosts(isAdminView);
                setPinnedPosts(pinned);
            }
            const { posts: newPosts, lastVisible: newLastVisible } = await api.fetchRegularPosts(10, typeFilter, isAdminView, loadMore ? lastVisible : undefined, user);
            setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);
            setLastVisible(newLastVisible);
        } catch (err: any) {
            console.error(err);
            setError("The feed failed to synchronize. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [authorId, typeFilter, isAdminView, lastVisible, user]);

    useEffect(() => { loadPosts(false); }, [typeFilter]);

    useEffect(() => {
        if (!authorId) return;
        setIsLoading(true);
        const unsubscribe = api.listenForPostsByAuthor(authorId, (userPosts) => {
            setPosts(userPosts);
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError("Could not load posts.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [authorId]);

    const handleUpvote = useCallback(async (postId: string) => {
        try {
            await api.upvotePost(postId, user.id);
            const updater = (prev: Post[]) => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes.includes(user.id) ? p.upvotes.filter(id => id !== user.id) : [...p.upvotes, user.id] } : p);
            setPosts(updater);
            setPinnedPosts(updater);
        } catch (error) { addToast('Interaction failed.', 'error'); }
    }, [user.id, addToast]);

    if (isLoading && posts.length === 0) return <div className="text-center p-20"><LoaderIcon className="h-10 w-10 animate-spin mx-auto text-brand-gold" /><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Syncing Pulse...</p></div>;
    
    if (error) return <div className="text-center p-20 bg-slate-800 rounded-[2.5rem] border border-red-500/20"><p className="text-red-400 font-bold">{error}</p><button onClick={() => loadPosts(false)} className="mt-4 text-brand-gold text-xs font-black uppercase tracking-widest">Retry Connection</button></div>;

    const allPosts = [...pinnedPosts.filter(p => !posts.some(regular => regular.id === p.id)), ...posts];

    return (
        <div className="space-y-6">
            {allPosts.map(post => (
                <PostItem 
                    key={post.id} post={post} currentUser={user} 
                    onUpvote={handleUpvote} onDelete={() => {}} onEdit={() => {}} 
                    onReport={() => {}} onViewProfile={onViewProfile} 
                    onRepost={() => {}} onShare={() => {}} onTogglePin={() => {}} 
                />
            ))}
            {allPosts.length === 0 && (
                <div className="text-center py-20 bg-slate-800 rounded-[2.5rem] border border-white/5">
                    <p className="text-gray-500 font-black uppercase tracking-widest">No entries found for this spectrum.</p>
                </div>
            )}
        </div>
    );
};
