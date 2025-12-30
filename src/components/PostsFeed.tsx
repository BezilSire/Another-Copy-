
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, User, Comment, Activity } from '../types';
import { DocumentSnapshot, DocumentData } from 'firebase/firestore';
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
import { MessageCircleIcon } from './icons/MessageSquareIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { SirenIcon } from './icons/SirenIcon';
import { PinIcon } from './icons/PinIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface PostsFeedProps {
  user: User;
  onViewProfile: (userId: string) => void;
  feedType?: 'all' | 'circle';
  authorId?: string;
  isAdminView?: boolean;
  typeFilter?: string;
}

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: () => void; isActive?: boolean; activeColor?: string; label?: string; }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', label }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors duration-200 ${isActive ? `${activeColor} bg-slate-700/50` : 'hover:bg-slate-700/50 text-gray-400'}`}>
        {icon}
        {count !== undefined && count > 0 && <span className="text-sm font-semibold">{count}</span>}
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
}> = 
({ post, currentUser, onUpvote, onViewProfile, onRepost, onShare }) => {
    const hasUpvoted = post.upvotes.includes(currentUser.id);
    const isAdminPost = post.authorRole === 'admin';
    const [showComments, setShowComments] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const typeStyles: Record<string, { icon: React.ReactNode; borderColor: string; badgeClasses: string; title: string }> = {
        proposal: { icon: <LightbulbIcon className="h-3 w-3" />, borderColor: 'border-blue-500/50', badgeClasses: 'bg-blue-500/20 text-blue-400 border-blue-500/30', title: 'Proposal' },
        offer: { icon: <UsersIcon className="h-3 w-3" />, borderColor: 'border-purple-500/50', badgeClasses: 'bg-purple-500/20 text-purple-400 border-purple-500/30', title: 'Offer' },
        opportunity: { icon: <BriefcaseIcon className="h-3 w-3" />, borderColor: 'border-emerald-500/50', badgeClasses: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', title: 'Work' },
        distress: { icon: <SirenIcon className="h-3 w-3" />, borderColor: 'border-red-500/50', badgeClasses: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse', title: 'Distress' },
        general: { icon: <MessageCircleIcon className="h-3 w-3" />, borderColor: 'border-slate-700', badgeClasses: 'bg-white/5 text-gray-500 border-white/10', title: 'Update' },
    };
    const typeInfo = typeStyles[post.types] || typeStyles['general'];

    // Aggressive truncation: 120 chars or multiple paragraphs
    const needsTruncation = post.content.length > 120 || post.content.includes('</p><p>') || post.content.includes('<br>');

    return (
        <div className={`bg-slate-900/60 p-6 rounded-[2.5rem] shadow-premium border border-white/5 border-l-4 ${typeInfo.borderColor} transition-all duration-300 animate-fade-in`}>
            {post.isPinned && <div className="flex items-center space-x-1 text-xs text-brand-gold mb-4 font-black uppercase tracking-widest"><PinIcon className="h-3 w-3"/><span>Pinned dispatch</span></div>}
            <div className="flex items-start space-x-4">
                <button onClick={() => onViewProfile(post.authorId)} className="shrink-0">
                     {isAdminPost ? <div className="w-10 h-10 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 flex items-center justify-center shadow-glow-gold"><LogoIcon className="h-6 w-6 text-brand-gold" /></div> : <div className="w-10 h-10 bg-slate-800 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner"><UserCircleIcon className="h-6 w-6 text-gray-600" /></div>}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => onViewProfile(post.authorId)} className="font-black text-white hover:text-brand-gold uppercase tracking-tight text-xs truncate">{post.authorName}</button>
                        {post.authorRole === 'admin' && <ShieldCheckIcon className="h-3 w-3 text-blue-500"/>}
                        <span className={`px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase tracking-[0.2em] flex items-center gap-1 ${typeInfo.badgeClasses}`}>
                            {typeInfo.icon} {typeInfo.title}
                        </span>
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                </div>
            </div>
            
            <div className="mt-6 relative">
                <div 
                    className={`text-slate-200 text-sm leading-relaxed wysiwyg-content opacity-90 transition-all duration-500 ease-in-out relative overflow-hidden ${!isExpanded && needsTruncation ? 'max-h-[4.5rem]' : 'max-h-[5000px]'}`}
                >
                    <MarkdownRenderer content={post.content} />
                    
                    {!isExpanded && needsTruncation && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none"></div>
                    )}
                </div>

                {needsTruncation && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="mt-4 w-full sm:w-auto text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-[0.3em] transition-all flex items-center justify-center sm:justify-start gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-brand-gold/40"
                    >
                        <span>{isExpanded ? '[ COLLAPSE DISPATCH ]' : '[ READ FULL DISPATCH... ]'}</span>
                        <ArrowRightIcon className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                )}
            </div>

            <div className="mt-8 flex justify-around items-center text-gray-500 border-t border-white/5 pt-2">
                <ActionButton icon={<ThumbsUpIcon className="h-4 w-4"/>} count={post.upvotes.length} onClick={() => onUpvote(post.id)} isActive={hasUpvoted} activeColor="text-brand-gold" label="Like" />
                <ActionButton icon={<MessageCircleIcon className="h-4 w-4"/>} count={post.commentCount} onClick={() => setShowComments(!showComments)} isActive={showComments} activeColor="text-blue-400" label="Comms" />
                <ActionButton icon={<RepeatIcon className="h-4 w-4"/>} count={post.repostCount} onClick={() => onRepost(post)} label="Repost" />
                <ActionButton icon={<ShareIcon className="h-4 w-4"/>} onClick={() => onShare(post)} label="Share" />
            </div>
        </div>
    );
};

export const PostsFeed: React.FC<PostsFeedProps> = ({ user, onViewProfile, authorId, isAdminView = false }) => {
    const [posts, setPosts] = useState<Post[]>([]);
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
            setError("Handshake unstable. Spectrum index not established.");
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
            const updater = (prev: Post[]) => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes.includes(user.id) ? p.upvotes.filter(id => id !== user.id) : [...p.upvotes, user.id] } : p);
            setPosts(updater);
        } catch (error) { addToast('Protocol signature failed.', 'error'); }
    }, [user.id, addToast]);

    if (isLoading && posts.length === 0) return (
        <div className="text-center p-20">
            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50 mx-auto" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em] mt-6">Syncing_Mainline_Stream</p>
        </div>
    );
    
    if (error) return (
        <div className="text-center p-20 bg-slate-900/60 rounded-[3rem] border border-red-500/20">
            <AlertTriangleIcon className="h-10 w-10 mx-auto text-red-500 mb-6 opacity-40" />
            <p className="text-red-400 font-black uppercase tracking-widest text-[11px] mb-3">Sync Anomaly Detected</p>
            <p className="text-gray-500 text-[10px] leading-relaxed max-w-xs mx-auto uppercase tracking-widest">{error}</p>
            <button onClick={() => loadPosts(false)} className="mt-10 px-10 py-4 bg-white/5 text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Reset Handshake</button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow-matrix animate-pulse"></div>
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Oracle_Mainline</span>
                </div>
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest font-mono">Synced: {posts.length} Blocks</span>
            </div>

            {posts.map(post => (
                <PostItem 
                    key={post.id} post={post} currentUser={user} 
                    onUpvote={handleUpvote} onViewProfile={onViewProfile} 
                    onRepost={() => {}} onShare={() => {}} 
                />
            ))}
            
            {!authorId && hasLastVisible && (
                <div className="pt-10 text-center pb-20">
                    <button 
                        onClick={() => loadPosts(true)}
                        className="px-12 py-5 bg-slate-950 border border-white/5 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white hover:border-brand-gold/30 transition-all shadow-xl active:scale-95"
                    >
                        Index More Blocks
                    </button>
                </div>
            )}
        </div>
    );
};
