
import React, { useState } from 'react';
import { Post, User } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { formatTimeAgo } from '../utils';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  currentUser: User;
  onRepost: (originalPost: Post, comment: string) => Promise<void>;
}

const MAX_COMMENT_LENGTH = 280;

export const RepostModal: React.FC<RepostModalProps> = ({ isOpen, onClose, post, currentUser, onRepost }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
        await onRepost(post, comment);
    } finally {
        // The parent component will close the modal on success,
        // so we only need to reset state on failure.
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white">Repost</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start space-x-3">
              <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
              <div className="w-full">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-800 p-2 rounded-md text-white border border-slate-700 focus:ring-green-500 focus:border-green-500 placeholder-gray-500 text-base"
                  rows={4}
                  placeholder="Add a comment..."
                  maxLength={MAX_COMMENT_LENGTH}
                  autoFocus
                />
                 <div className="text-right text-xs text-gray-400 mt-1">
                    {comment.length} / {MAX_COMMENT_LENGTH}
                </div>
              </div>
            </div>
            {/* Original Post Embed */}
            <div className="border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-semibold text-white text-sm">{post.authorName}</p>
                  <p className="text-xs text-gray-500">{post.authorCircle} &bull; {formatTimeAgo(post.date)}</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>
          <div className="bg-slate-800 px-4 py-3 flex justify-end items-center">
            <button
              type="button"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:bg-slate-500"
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Posting...' : 'Repost'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
