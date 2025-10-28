import React, { useState, useEffect } from 'react';
import { User, Proposal, Comment } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Timestamp } from 'firebase/firestore';
import { formatTimeAgo } from '../utils';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SendIcon } from './icons/SendIcon';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';

// Comment Section logic is brought in here to adapt for proposals

const CommentItem: React.FC<{
    comment: Comment;
    onDelete: (commentId: string) => void;
    onUpvote: (commentId: string) => void;
    currentUser: User;
}> = ({ comment, onDelete, onUpvote, currentUser }) => {
    const isOwnComment = currentUser.id === comment.authorId;
    const hasUpvoted = comment.upvotes.includes(currentUser.id);

    return (
        <div className="flex items-start space-x-3 py-3">
            <UserCircleIcon className="h-8 w-8 text-gray-400"/>
            <div className="flex-1">
                <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                         <span className="font-semibold text-sm text-white">{comment.authorName}</span>
                        <p className="text-xs text-gray-500">{comment.timestamp ? formatTimeAgo(comment.timestamp.toDate().toISOString()) : 'sending...'}</p>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                        <MarkdownRenderer content={comment.content} />
                    </p>
                </div>
                <div className="flex items-center space-x-3 mt-1 pl-2">
                    <button onClick={() => onUpvote(comment.id)} className={`flex items-center space-x-1 text-xs ${hasUpvoted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}`}>
                        <ThumbsUpIcon className="h-3 w-3" />
                        <span>{comment.upvotes.length > 0 ? comment.upvotes.length : 'Like'}</span>
                    </button>
                    {isOwnComment && (
                         <button onClick={() => onDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-400">Delete</button>
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
        const unsubscribe = api.listenForComments(parentId, setComments, 'proposals', (error) => {
            console.error("Failed to load comments for proposal:", error);
            addToast("Could not load comments for this proposal.", "error");
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
            await api.addComment(parentId, commentData, 'proposals');
            setNewComment('');
        } catch (error) {
            console.error("Failed to post comment:", error);
            addToast("Failed to post comment.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteComment = async (commentId: string) => {
        if(window.confirm("Are you sure you want to delete this comment?")) {
            await api.deleteComment(parentId, commentId, 'proposals');
        }
    };
    
    const handleUpvoteComment = async (commentId: string) => {
        await api.upvoteComment(parentId, commentId, currentUser.id, 'proposals');
    };

    return (
        <div className="pt-4 mt-6 border-t border-slate-700">
             <h3 className="text-lg font-semibold text-white mb-2">Discussion ({comments.length})</h3>
            <div>
                {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} currentUser={currentUser} onDelete={handleDeleteComment} onUpvote={handleUpvoteComment} />
                ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-4 border-t border-slate-700/50 mt-4">
                <UserCircleIcon className="h-8 w-8 text-gray-400"/>
                <input 
                    type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add to the discussion..."
                    className="flex-1 bg-slate-700 rounded-full py-2 px-4 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
                />
                <button type="submit" disabled={isSubmitting || !newComment.trim()} className="p-2 rounded-full text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-600">
                    <SendIcon className="h-5 w-5"/>
                </button>
            </form>
        </div>
    );
};

// Main Component
interface ProposalDetailsPageProps {
  proposalId: string;
  currentUser: User;
  onBack: () => void;
  isAdminView?: boolean;
}

export const ProposalDetailsPage: React.FC<ProposalDetailsPageProps> = ({ proposalId, currentUser, onBack, isAdminView }) => {
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoting, setIsVoting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        api.getProposal(proposalId).then(data => {
            if (data) {
                setProposal(data);
            } else {
                addToast('Proposal not found.', 'error');
            }
        }).catch(() => addToast('Failed to load proposal.', 'error'))
        .finally(() => setIsLoading(false));
    }, [proposalId, addToast]);

    const handleVote = async (vote: 'for' | 'against') => {
        if (!proposal) return;
        setIsVoting(true);
        try {
            await api.voteOnProposal(proposal.id, currentUser.id, vote);
            addToast("Your vote has been cast!", 'success');
            // Optimistically update UI
            setProposal(prev => {
                if (!prev) return null;
                const userVote = prev.votesFor.includes(currentUser.id) ? 'for' : prev.votesAgainst.includes(currentUser.id) ? 'against' : null;
                if (userVote) return prev; // already voted

                return {
                    ...prev,
                    votesFor: vote === 'for' ? [...prev.votesFor, currentUser.id] : prev.votesFor,
                    votesAgainst: vote === 'against' ? [...prev.votesAgainst, currentUser.id] : prev.votesAgainst,
                    voteCountFor: prev.voteCountFor + (vote === 'for' ? 1 : 0),
                    voteCountAgainst: prev.voteCountAgainst + (vote === 'against' ? 1 : 0),
                };
            });
        } catch (error) {
            if (error instanceof Error && error.message.includes("already voted")) {
                addToast("You have already voted on this proposal.", "info");
            } else {
                addToast("Failed to cast vote.", "error");
            }
        } finally {
            setIsVoting(false);
        }
    };
    
    if (isLoading) return <div className="text-center p-10"><LoaderIcon className="h-8 w-8 animate-spin mx-auto text-green-500" /></div>;
    if (!proposal) return <div className="text-center p-10">Proposal not found.</div>;

    const userVote = proposal.votesFor.includes(currentUser.id) ? 'for' : proposal.votesAgainst.includes(currentUser.id) ? 'against' : null;
    const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
    const forPercentage = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (proposal.voteCountAgainst / totalVotes) * 100 : 0;
    const statusPill = {
        active: 'bg-blue-500/20 text-blue-300',
        passed: 'bg-green-500/20 text-green-300',
        failed: 'bg-red-500/20 text-red-300',
        closed: 'bg-slate-600/50 text-slate-300',
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in">
            <button onClick={onBack} className="inline-flex items-center mb-4 text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Proposals
            </button>
            <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold text-white mb-2">{proposal.title}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusPill[proposal.status]}`}>{proposal.status}</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Created on {proposal.createdAt.toDate().toLocaleDateString()}</p>
            
            <div className="text-gray-300 leading-relaxed my-4">
                <MarkdownRenderer content={proposal.description} />
            </div>

            <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-400">{proposal.voteCountFor} Votes For</span>
                    <span className="text-red-400">{proposal.voteCountAgainst} Votes Against</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 flex overflow-hidden">
                    <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${forPercentage}%` }} title={`${forPercentage.toFixed(1)}% For`}></div>
                    <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${againstPercentage}%` }} title={`${againstPercentage.toFixed(1)}% Against`}></div>
                </div>
            </div>

            {!isAdminView && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                    {userVote ? (
                        <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
                        {userVote === 'for' ? <CheckCircleIcon className="h-6 w-6 text-green-400" /> : <XCircleIcon className="h-6 w-6 text-red-400" />}
                            <span>You voted {userVote.toUpperCase()}</span>
                        </div>
                    ) : proposal.status === 'active' ? (
                        <div className="flex items-center justify-center space-x-4">
                            <button disabled={isVoting} onClick={() => handleVote('for')} className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold disabled:bg-slate-600">Vote For</button>
                            <button disabled={isVoting} onClick={() => handleVote('against')} className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold disabled:bg-slate-600">Vote Against</button>
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 font-semibold">Voting on this proposal is closed.</p>
                    )}
                </div>
            )}
            
            <CommentSection parentId={proposal.id} currentUser={currentUser} />
        </div>
    );
};