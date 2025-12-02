

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

const postTypeTooltips: Record<string, string> = {
    proposal: "This is a proposal for a new idea, project, or policy for the commons.",
    offer: "This is an offer of a skill, service, or resource to other members.",
    opportunity: "This is a job opening, collaboration request, or other opportunity.",
};

// --- Comment Section Components ---

const CommentItem: React.FC<{
    comment: Comment;
    postId: string;
    currentUser: User;
    onDelete: (postId: string, commentId: string) => void;
    onUpvote: (postId: string, commentId: string) => void;
    onViewProfile: (userId: string) => void;
}> = ({ comment, postId, currentUser, onDelete, onUpvote, onViewProfile }) => {
    const isOwnComment = currentUser.id === comment.authorId;
    const hasUpvoted = comment.upvotes.includes(currentUser.id);

    return (
        <div className="flex items-start space-x-3 py-3">
            <button onClick={() => onViewProfile(comment.authorId)}>
                <UserCircleIcon className="h-8 w-8 text-gray-400"/>
            </button>
            <div className="flex-1">
                <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                         <button onClick={() => onViewProfile(comment.authorId)} className="font-semibold text-sm text-white hover:underline">{comment.authorName}</button>
                        <p className="text-xs text-gray-500">{comment.timestamp ? formatTimeAgo(comment.timestamp.toDate().toISOString()) : 'sending...'}</p>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                        <MarkdownRenderer content={comment.content} />
                    </p>
                </div>
                <div className="flex items-center space-x-3 mt-1 pl-2">
                    <button onClick={() => onUpvote(postId, comment.id)} className={`flex items-center space-x-1 text-xs ${hasUpvoted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}`}>
                        <ThumbsUpIcon className="h-3 w-3" />
                        <span>{comment.upvotes.length > 0 ? comment.upvotes.length : 'Like'}</span>
                    </button>
                    {isOwnComment && (
                         <button onClick={() => onDelete(postId, comment.id)} className="text-xs text-gray-400 hover:text-red-400">Delete</button>
                    )}
                </div>
            </div>
        </div>
    );
};


const CommentSection: React.FC<{
    postId: string;
    currentUser: User;
    onViewProfile: (userId: string) => void;
}> = ({ postId, currentUser, onViewProfile }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubscribe = api.listenForComments(postId, setComments, 'posts', (error) => {
            console.error("Error listening for comments:", error);
            addToast("Could not load comments for this post.", "error");
        });
        return () => unsubscribe();
    }, [postId, addToast]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        const commentData: Omit<Comment, 'id' | 'timestamp'> = {
            parentId: postId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            content: newComment,
            upvotes: [],
        };
        try {
            await api.addComment(postId, commentData, 'posts');
            setNewComment('');
        } catch (error) {
            console.error("Failed to post comment:", error);
            addToast("Failed to post comment.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteComment = async (postId: string, commentId: string) => {
        if(window.confirm("Are you sure you want to delete this comment?")) {
            await api.deleteComment(postId, commentId, 'posts');
        }
    };
    
    const handleUpvoteComment = async (postId: string, commentId: string) => {
        await api.upvoteComment(postId, commentId, currentUser.id, 'posts');
    };

    return (
        <div className="pt-2">
            <div className="border-t border-slate-700/50 mt-2 pt-2">
                {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} postId={postId} currentUser={currentUser} onDelete={handleDeleteComment} onUpvote={handleUpvoteComment} onViewProfile={onViewProfile} />
                ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400"/>
                <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-slate-700 rounded-full py-2 px-4 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
                />
                <button type="submit" disabled={isSubmitting || !newComment.trim()} className="p-2 rounded-full text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-600">
                    <SendIcon className="h-5 w-5"/>
                </button>
            </form>
        </div>
    );
};

// --- Post Item Component ---

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

    const textContentLength = useMemo(() => {
        if (typeof document === 'undefined') return 0;
        const div = document.createElement('div');
        div.innerHTML = post.content || '';
        return (div.textContent || div.innerText || '').length;
    }, [post.content]);

    const TRUNCATE_THRESHOLD = 350; // characters
    const needsTruncation = textContentLength > TRUNCATE_THRESHOLD;
  
    const typeStyles: Record<string, { icon: React.ReactNode; borderColor: string; title: string }> = {
        proposal: {
          icon: <LightbulbIcon className="h-4 w-4 text-blue-300" />,
          borderColor: 'border-blue-500/50',
          title: 'Proposal',
        },
        offer: {
          icon: <UsersIcon className="h-4 w-4 text-purple-300" />,
          borderColor: 'border-purple-500/50',
          title: 'Offer',
        },
        opportunity: {
          icon: <BriefcaseIcon className="h-4 w-4 text-green-300" />,
          borderColor: 'border-green-500/50',
          title: 'Opportunity',
        },
        distress: {
          icon: <SirenIcon className="h-4 w-4 text-red-400" />,
          borderColor: 'border-red-500/50',
          title: 'Distress Call',
        },
        general: {
          icon: <MessageCircleIcon className="h-4 w-4 text-slate-400" />,
          borderColor: 'border-slate-700',
          title: 'General Post',
        },
    };

    const typeInfo = typeStyles[post.types] || typeStyles['general'];

    // Determine if this opportunity matches the user's skills
    const isSkillMatch = useMemo(() => {
        if (!post.requiredSkills || post.requiredSkills.length === 0) return false;
        if (!currentUser.skills || currentUser.skills.length === 0) return false;
        if (isOwnPost) return false; // Don't match own posts
        
        const userSkillsLower = currentUser.skills.map(s => s.toLowerCase());
        const requiredSkillsLower = post.requiredSkills.map(s => s.toLowerCase());
        
        return requiredSkillsLower.some(req => userSkillsLower.includes(req));
    }, [post.requiredSkills, currentUser.skills, isOwnPost]);

    return (
        <div className={`bg-slate-800 p-6 rounded-lg shadow-lg border-l-4 ${typeInfo.borderColor}`}>
            {post.isPinned && (
                <div className="flex items-center space-x-1 text-xs text-yellow-400 mb-2 font-semibold">
                    <PinIcon className="h-4 w-4"/>
                    <span>Pinned by Admin</span>
                </div>
            )}
            {isSkillMatch && (
                 <div className="flex items-center space-x-1 text-xs text-green-400 mb-2 font-semibold animate-pulse">
                    <BriefcaseIcon className="h-4 w-4"/>
                    <span>✨ Matches your skills!</span>
                </div>
            )}
            <div className="flex items-start space-x-4">
                <button onClick={() => !isDistressPost && onViewProfile(post.authorId)} disabled={isDistressPost}>
                     {isAdminPost ? <LogoIcon className="h-10 w-10 text-green-500" /> : <UserCircleIcon className="h-10 w-10 text-gray-400" />}
                </button>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => !isDistressPost && onViewProfile(post.authorId)} 
                                    className="font-bold text-white hover:underline disabled:cursor-default"
                                    disabled={isDistressPost}
                                >
                                    {post.authorName}
                                </button>
                                {post.authorRole === 'admin' && <ShieldCheckIcon className="h-4 w-4 text-green-400" title="Admin"/>}
                            </div>
                            <p className="text-xs text-gray-400">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                        </div>
                        {/* More options dropdown can go here */}
                    </div>
                </div>
            </div>
            
            {post.repostedFrom && (
                 <div className="mt-4 pl-4 border-l-2 border-slate-700">
                    <div className="flex items-center space-x-2">
                        <UserCircleIcon className="h-6 w-6 text-gray-400" />
                        <div>
                            <p className="font-semibold text-white text-sm">{post.repostedFrom.authorName}</p>
                            <p className="text-xs text-gray-500">{post.repostedFrom.authorCircle} &bull; {formatTimeAgo(post.repostedFrom.date)}</p>
                        </div>
                    </div>
                    <div className="text-gray-300 mt-2 text-sm line-clamp-3">
                         <MarkdownRenderer content={post.repostedFrom.content} />
                    </div>
                </div>
            )}

            <div className={`text-white mt-4 text-sm wysiwyg-content ${needsTruncation && !isExpanded ? 'line-clamp-6' : ''}`}>
                <MarkdownRenderer content={post.content} />
            </div>
            
            {post.requiredSkills && post.requiredSkills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {post.requiredSkills.map(skill => (
                        <span key={skill} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-blue-300 border border-slate-600">
                           {skill}
                        </span>
                    ))}
                </div>
            )}

            {needsTruncation && (
                <button onClick={() => setIsExpanded(prev => !prev)} className="text-sm font-semibold text-green-400 hover:text-green-300 mt-2 transition-colors">
                    {isExpanded ? 'Show less' : 'Read more...'}
                </button>
            )}

            <div className="mt-4 flex justify-around items-center text-gray-400 border-t border-b border-slate-700/50">
                <ActionButton icon={<ThumbsUpIcon className="h-5 w-5"/>} count={post.upvotes.length} onClick={() => onUpvote(post.id)} isActive={hasUpvoted} activeColor="text-green-400" title={`Like (${post.upvotes.length})`} />
                <ActionButton icon={<MessageCircleIcon className="h-5 w-5"/>} count={post.commentCount} onClick={() => setShowComments(!showComments)} isActive={showComments} activeColor="text-blue-400" title={`Comment (${post.commentCount || 0})`} />
                <ActionButton icon={<RepeatIcon className="h-5 w-5"/>} count={post.repostCount} onClick={() => onRepost(post)} title={`Repost (${post.repostCount || 0})`} />
                <ActionButton icon={<ShareIcon className="h-5 w-5"/>} onClick={() => onShare(post)} title="Share" />
            </div>

            {showComments && <CommentSection postId={post.id} currentUser={currentUser} onViewProfile={onViewProfile} />}

            <div className="mt-2 flex items-center justify-end space-x-4 text-xs">
                {isOwnPost && <button onClick={() => onEdit(post)} className="text-gray-400 hover:text-green-400" title="Edit"><PencilIcon className="h-4 w-4"/></button>}
                {(isOwnPost || isAdminView) && <button onClick={() => onDelete(post)} className="text-gray-400 hover:text-red-400" title="Delete"><TrashIcon className="h-4 w-4"/></button>}
                {!isOwnPost && !isDistressPost && <button onClick={() => onReport(post)} className="text-gray-400 hover:text-yellow-400" title="Report"><FlagIcon className="h-4 w-4"/></button>}
                 {isAdminView && <button onClick={() => onTogglePin(post)} className={`flex items-center gap-1 ${post.isPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`} title={post.isPinned ? 'Unpin' : 'Pin'}><PinIcon className="h-4 w-4"/></button>}
            </div>
        </div>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count?: number; onClick: () => void; isActive?: boolean; activeColor?: string; title?: string; }> = 
({ icon, count, onClick, isActive, activeColor = 'text-green-400', title }) => (
    <button onClick={onClick} title={title} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors duration-200 ${isActive ? `${activeColor} bg-slate-700/50` : 'hover:bg-slate-700/50'}`}>
        {icon}
        {count !== undefined && count > 0 && <span className="text-sm font-semibold">{count}</span>}
    </button>
);


// --- Main Feed Component ---

interface PostsFeedProps {
  user: User;
  onViewProfile: (userId: string) => void;
  feedType?: 'all' | 'circle';
  authorId?: string; // To show only a specific user's posts
  isAdminView?: boolean;
  typeFilter?: FilterType;
}

export const PostsFeed: React.FC<PostsFeedProps> = ({ user, onViewProfile, feedType = 'all', authorId, isAdminView = false, typeFilter = 'all' }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [repostingPost, setRepostingPost] = useState<Post | null>(null);
    const [deletingPost, setDeletingPost] = useState<Post | null>(null);
    const { addToast } = useToast();
    const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadPosts = useCallback(async (loadMore = false) => {
        if (authorId) return; // This feed variant is handled by a listener.
        
        const loader = loadMore ? setIsLoadingMore : setIsLoading;
        loader(true);
        setError(null);
        
        try {
            if (!loadMore) {
                const pinned = await api.fetchPinnedPosts(isAdminView);
                setPinnedPosts(pinned);
            }

            const startAfter = loadMore ? lastVisible : null;
            // Pass the current user to fetchRegularPosts so it can access the following list
            const { posts: newPosts, lastVisible: newLastVisible } = await api.fetchRegularPosts(10, typeFilter, isAdminView, startAfter as DocumentSnapshot<DocumentData> | undefined, user);
            
            setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);
            setLastVisible(newLastVisible);
            setHasMore(newPosts.length === 10);
        } catch (err) {
            setError("Could not load the feed. Please try again later.");
            console.error(err);
        } finally {
            loader(false);
        }
    }, [authorId, typeFilter, isAdminView, lastVisible, user]);

    useEffect(() => {
        loadPosts(false);
    }, [typeFilter]); // Reload when filter changes

     useEffect(() => {
        if (!authorId) return; // Only run when showing a specific user's profile activity
        
        setIsLoading(true);
        const unsubscribe = api.listenForPostsByAuthor(authorId, (userPosts) => {
            const filtered = typeFilter === 'all' ? userPosts : userPosts.filter(p => p.types === typeFilter);
            setPosts(filtered);
            setPinnedPosts([]); // Don't show pinned posts on user profiles
            setIsLoading(false);
        }, (err) => {
            setError("Could not load this user's posts.");
            setIsLoading(false);
            console.error(err);
        });
        return () => unsubscribe();
    }, [authorId, typeFilter]);

    const handleUpvote = useCallback(async (postId: string) => {
        try {
            await api.upvotePost(postId, user.id);
            // Optimistic update
            const updater = (prevPosts: Post[]) => prevPosts.map(p => {
                if (p.id === postId) {
                    const upvoted = p.upvotes.includes(user.id);
                    return { ...p, upvotes: upvoted ? p.upvotes.filter(uid => uid !== user.id) : [...p.upvotes, user.id] };
                }
                return p;
            });
            setPosts(updater);
            setPinnedPosts(updater);
        } catch (error) {
            addToast('Failed to vote on post.', 'error');
        }
    }, [user.id, addToast]);
    
    const handleConfirmDelete = useCallback(async () => {
        if (!deletingPost) return;
        try {
            if (deletingPost.types === 'distress' && isAdminView) {
                await api.deleteDistressPost(user, deletingPost.id, deletingPost.authorId);
            } else {
                await api.deletePost(deletingPost.id);
            }
            setPosts(posts => posts.filter(p => p.id !== deletingPost.id));
            setPinnedPosts(posts => posts.filter(p => p.id !== deletingPost.id));
            addToast('Post deleted successfully.', 'success');
        } catch {
            addToast('Failed to delete post.', 'error');
        } finally {
            setDeletingPost(null);
        }
    }, [deletingPost, user, isAdminView, addToast]);
    
    const handleEditSave = useCallback(async (postId: string, newContent: string) => {
        try {
            await api.updatePost(postId, newContent);
            const updater = (prevPosts: Post[]) => prevPosts.map(p => p.id === postId ? { ...p, content: newContent } : p);
            setPosts(updater);
            setPinnedPosts(updater);
            addToast('Post updated.', 'success');
            setEditingPost(null);
        } catch {
            addToast('Failed to update post.', 'error');
        }
    }, [addToast]);
    
    const handleReportSubmit = useCallback(async (reason: string, details: string) => {
        if (!reportingPost) return;
        try {
            await api.reportPost(user, reportingPost, reason, details);
            addToast('Post reported. An admin will review it shortly.', 'success');
        } catch {
            addToast('Failed to report post.', 'error');
        } finally {
            setReportingPost(null);
        }
    }, [reportingPost, user, addToast]);

    const handleRepostSubmit = useCallback(async (originalPost: Post, comment: string) => {
        try {
            await api.repostPost(originalPost, user, comment);
            addToast('Post reposted successfully!', 'success');
            setRepostingPost(null);
            // Optionally, refresh the feed
            loadPosts();
        } catch (error) {
             addToast('Failed to repost.', 'error');
        }
    }, [user, addToast, loadPosts]);

    const handleShare = useCallback(async (post: Post) => {
        // Simple function to strip HTML for sharing plain text
        const stripHtml = (html: string | null | undefined) => {
            if (!html) {
                return "";
            }
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        };

        const shareData = {
            title: 'Ubuntium Global Commons Post',
            text: stripHtml(post.content).substring(0, 280) + '...',
            url: window.location.href, // This could be improved to a direct post link
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    addToast('Share failed.', 'error');
                }
            }
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
            addToast('Link copied to clipboard!', 'info');
        }
    }, [addToast]);
    
    const handleTogglePin = useCallback(async (post: Post) => {
        if (!isAdminView) return;
        const newPinStatus = !post.isPinned;
        try {
            await api.togglePinPost(user, post.id, newPinStatus);
            addToast(newPinStatus ? 'Post pinned.' : 'Post unpinned.', 'success');
            // Refresh feed to see changes
            loadPosts();
        } catch (error) {
            addToast('Failed to update pin status.', 'error');
        }
    }, [isAdminView, user, addToast, loadPosts]);


    if (isLoading) return <div className="text-center p-10"><LoaderIcon className="h-8 w-8 animate-spin mx-auto text-green-500" /></div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;

    const allPosts = [...pinnedPosts.filter(p => !posts.some(regularPost => regularPost.id === p.id)), ...posts];

    return (
        <div className="space-y-4">
            {allPosts.map(post => (
                <PostItem 
                    key={post.id} 
                    post={post} 
                    currentUser={user}
                    onUpvote={handleUpvote}
                    onDelete={setDeletingPost}
                    onEdit={setEditingPost}
                    onReport={setReportingPost}
                    onViewProfile={onViewProfile}
                    onRepost={setRepostingPost}
                    onShare={handleShare}
                    onTogglePin={handleTogglePin}
                    isAdminView={isAdminView}
                />
            ))}

            {!authorId && hasMore && (
                 <div className="text-center">
                    <button onClick={() => loadPosts(true)} disabled={isLoadingMore} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold disabled:bg-slate-800">
                        {isLoadingMore ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Load More'}
                    </button>
                </div>
            )}
            
            {allPosts.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
                    <p className="font-semibold text-lg text-white">The feed is empty</p>
                    <p>No posts match the current filter.</p>
                </div>
            )}

            {editingPost && <EditPostModal isOpen={!!editingPost} onClose={() => setEditingPost(null)} post={editingPost} onSave={handleEditSave} />}
            {reportingPost && <ReportPostModal isOpen={!!reportingPost} onClose={() => setReportingPost(null)} post={reportingPost} onReportSubmit={handleReportSubmit} />}
            {repostingPost && <RepostModal isOpen={!!repostingPost} onClose={() => setRepostingPost(null)} post={repostingPost} currentUser={user} onRepost={handleRepostSubmit} />}
            {deletingPost && <ConfirmationDialog isOpen={!!deletingPost} onClose={() => setDeletingPost(null)} onConfirm={handleConfirmDelete} title="Delete Post" message="Are you sure you want to permanently delete this post?" confirmButtonText="Delete" />}
        </div>
    );
};
