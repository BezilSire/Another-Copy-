import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSave: (postId: string, newContent: string) => Promise<void>;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, post, onSave }) => {
  const [content, setContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(post.content);
  }, [post]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    await onSave(post.id, content);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                Edit Post
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-700 p-2 rounded-md text-white focus:ring-green-500 focus:border-green-500"
                rows={5}
              />
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isSaving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-slate-500"
              onClick={handleSave}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-gray-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
