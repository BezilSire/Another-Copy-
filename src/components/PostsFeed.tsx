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
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface PostsFeedProps {
  user: User;
  onViewProfile: (userId: string) => void;
  feedType?: 'all' | 'circle';
  authorId?: string;
  isAdminView?: boolean;
  typeFilter?: FilterType;
  onFilterReset?: () => void;
}

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: () => void; isActive?: boolean; activeColor?: string; title?: string; label?: string; }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', title, label }) => (
    <button onClick={onClick} title={title} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors duration-200 ${isActive ? `${activeColor} bg-slate-700/50` : 'hover:bg-slate-700/50 text-gray-400'}`}>
        {icon}
        {count !== undefined && count > 0 && <span className="text-sm font-semibold">{count}</span>}
        {label && <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">{label}</span>}
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

    const typeStyles: Record<string, { icon: React.ReactNode; borderColor: string; badgeClasses: string; title: string }> = {
        proposal: { icon: <LightbulbIcon className="h-4 w-4 text-blue-300" />, borderColor: 'border-blue-500/50', badgeClasses: 'bg-blue-500/20 text-blue-400 border-blue-500/30', title: 'Proposal' },
        offer: { icon: <UsersIcon className="h-4 w-4 text-purple-300" />, borderColor: 'border-purple-500/50', badgeClasses: 'bg-purple-500/20 text-purple-400 border-purple-500/30', title: 'Offer' },
        opportunity: { icon: <BriefcaseIcon className="h-4 w-4 text-green-300" />, borderColor: 'border-green-500/50', badgeClasses: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', title: 'Opportunity' },
        distress: { icon: <SirenIcon className="h-4 w-4 text-red-400" />, borderColor: 'border-red-500/50', badgeClasses: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse', title: 'Distress' },
        general: { icon: <MessageCircleIcon className="h-4 w-4 text-slate-400" />, borderColor: 'border-slate-700', badgeClasses: 'bg-white/5 text-gray-500 border-white/10', title: 'Update' },
    };
    const typeInfo = typeStyles[post.types] || typeStyles['general'];

    return (
        <div className={`bg-slate-900/60 p-6 rounded-[2.5rem] shadow-premium border border-white/5 border-l-4 ${typeInfo.borderColor} transition-all duration-300 animate-fade-in`}>
            {post.isPinned && <div className="flex items-center space-x-1 text-xs text-brand-gold mb-4 font-black uppercase tracking-widest"><PinIcon className="h-3 w-3"/><span>Pinned dispatch</span></div>}
            <div className="flex items-start space-x-4">
                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} disabled={isDistressPost} className="shrink-0">
                     {isAdminPost ? <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 flex items-center justify-center shadow-glow-gold"><LogoIcon className="h-8 w-8 text-brand-gold" /></div> : <div className="w-12 h-12 bg-slate-800 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner group-hover:border-brand-gold/30 transition-all"><UserCircleIcon className="h-8 w-8 text-gray-600" /></div>}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} className="font-black text-white hover:text-brand-gold uppercase tracking-tight text-sm truncate" disabled={isDistressPost}>{post.authorName}</button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3 w-3 text-blue-500"/>}
                                <span className={`px-2.5 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${typeInfo.badgeClasses}`}>
                                    {typeInfo.title}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className={`text-slate-200 mt-6 text-sm leading-relaxed wysiwyg-content ${!isExpanded ? 'line-clamp-6' : ''} opacity-90`}>
                <MarkdownRenderer content={post.content} />
            </div>

            {post.requiredSkills && post.requiredSkills.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                    {post.requiredSkills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-slate-950 border border-white/5 rounded-lg text-[9px] font-black uppercase text-gray-500 tracking-widest">{skill}</span>
                    ))}
                </div>
            )}

            <div className="mt-8 flex justify-around items-center text-gray-500 border-t border-white/5 pt-2">
                <ActionButton icon={<ThumbsUpIcon className="h-4 w-4"/>} count={post.upvotes.length} onClick={() => onUpvote(post.id)} isActive={hasUpvoted} activeColor="text-brand-gold" label="Like" />
                <ActionButton icon={<MessageCircleIcon className="h-4 w-4"/>} count={post.commentCount} onClick={() => setShowComments(!showComments)} isActive={showComments} activeColor="text-blue-400" label="Comms" />
                <ActionButton icon={<RepeatIcon className="h-4 w-4"/>} count={post.repostCount} onClick={() => onRepost(post)} label="Repost" />
                <ActionButton icon={<ShareIcon className="h-4 w-4"/>} onClick={() => onShare(post)} label="Share" />
            </div>
        </div>
    );
};

export const PostsFeed: React.FC<PostsFeedProps> = ({ user, onViewProfile, feedType = 'all', authorId, isAdminView = false, typeFilter = 'all', onFilterReset }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
        setError(null);

        try {
            if (isInitial) {
                const pinned = await api.fetchPinnedPosts(isAdminView).catch(() => []);
                setPinnedPosts(pinned);
            }
            
            // Forces 'all' filter to ensure unified feed regardless of legacy state
            const { posts: newPosts, lastVisible: nextDoc } = await api.fetchRegularPosts(
                10, 
                'all', 
                isAdminView, 
                loadMore ? (lastVisibleRef.current || undefined) : undefined, 
                user
            );
            
            lastVisibleRef.current = nextDoc;
            setHasLastVisible(!!nextDoc);
            setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);
        } catch (err: any) {
            console.error("Feed sync error:", err);
            setError("Handshake unstable. Spectrum index not yet established.");
        } finally {
            setIsLoading(false);
        }
    }, [authorId, isAdminView, user]);

    useEffect(() => { 
        loadPosts(false); 
    }, [loadPosts]);

    useEffect(() => {
        if (!authorId) return;
        setIsLoading(true);
        const unsubscribe = api.listenForPostsByAuthor(authorId, (userPosts) => {
            setPosts(userPosts);
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError("Identity activity stream unavailable.");
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
        } catch (error) { addToast('Protocol signature failed.', 'error'); }
    }, [user.id, addToast]);

    const handleRetryHandshake = () => {
        if (onFilterReset) onFilterReset();
        loadPosts(false);
    };

    if (isLoading && posts.length === 0) return (
        <div className="text-center p-20">
            <div className="relative inline-block mb-4">
                <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-brand-gold rounded-full animate-ping"></div>
                </div>
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-4">Syncing_Temporal_Pulse</p>
        </div>
    );
    
    if (error) return (
        <div className="text-center p-20 bg-slate-900/60 rounded-[3rem] border border-red-500/20">
            <AlertTriangleIcon className="h-10 w-10 mx-auto text-red-500 mb-6 opacity-40" />
            <p className="text-red-400 font-black uppercase tracking-widest text-[11px] mb-3">Sync Anomaly Detected</p>
            <p className="text-gray-500 text-[10px] leading-relaxed max-w-xs mx-auto uppercase tracking-widest">{error}</p>
            <button onClick={handleRetryHandshake} className="mt-10 px-10 py-4 bg-white/5 text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95">Reset Handshake</button>
        </div>
    );

    const allPosts = [...pinnedPosts.filter(p => !posts.some(regular => regular.id === p.id)), ...posts];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-matrix animate-pulse"></div>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Mainline_Active</span>
                </div>
            </div>

            {allPosts.map(post => (
                <PostItem 
                    key={post.id} post={post} currentUser={user} 
                    onUpvote={handleUpvote} onDelete={() => {}} onEdit={() => {}} 
                    onReport={() => {}} onViewProfile={onViewProfile} 
                    onRepost={() => {}} onShare={() => {}} onTogglePin={() => {}} 
                />
            ))}
            
            {allPosts.length === 0 && (
                <div className="text-center py-32 bg-slate-900/40 rounded-[3rem] border border-white/5 opacity-40">
                    <p className="text-gray-600 font-black uppercase tracking-[0.5em] text-[10px]">Spectrum Void: No entries indexed.</p>
                </div>
            )}
            
            {!authorId && hasLastVisible && (
                <div className="pt-10 text-center pb-20">
                    <button 
                        onClick={() => loadPosts(true)}
                        className="px-12 py-5 bg-slate-950 border border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white hover:border-brand-gold/30 transition-all shadow-xl active:scale-95"
                    >
                        Index More Blocks
                    </button>
                </div>
            )}
        </div>
    );
};