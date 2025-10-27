import React, { useState, useRef, useEffect } from 'react';
import { User, Post } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { UsersIcon } from './icons/UsersIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';


interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onPostCreated: () => void;
}

const PostTypeButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    value: Post['types'];
    currentValue: Post['types'];
    onClick: (value: Post['types']) => void;
    tooltip: string;
}> = ({ label, icon, value, currentValue, onClick, tooltip }) => (
    <div className="relative group flex-1">
        <button
            onClick={() => onClick(value)}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-lg transition-colors duration-200 space-y-1 text-sm
                ${currentValue === value ? 'bg-green-600/20 text-green-300' : 'bg-slate-800 hover:bg-slate-700 text-gray-300'}
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-slate-700 z-10">
            {tooltip}
        </div>
    </div>
);


const MAX_POST_LENGTH = 500;

export const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose, user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [textLength, setTextLength] = useState(0);
  const [postType, setPostType] = useState<Post['types']>('general');
  const [isPosting, setIsPosting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setContent('');
      setTextLength(0);
      setPostType('general');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      // Focus the editor slightly after the modal animation
      setTimeout(() => editorRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const html = e.currentTarget.innerHTML;
      const text = e.currentTarget.textContent || '';
      setContent(html);
      setTextLength(text.length);
  };

  const handlePost = async () => {
    if (textLength === 0) return;
    setIsPosting(true);
    try {
      await api.createPost(user, content, postType);
      onPostCreated(); // This will close the modal via parent state
    } catch (error) {
      console.error("Failed to create post:", error);
      setIsPosting(false); // Let user retry on failure
    }
  };

  const handleFormatClick = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    // Manually trigger input event to update React state after execCommand
    if (editorRef.current) {
        const event = new Event('input', { bubbles: true });
        editorRef.current.dispatchEvent(event);
    }
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
             <h3 className="text-lg font-bold text-white">Create a Post</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
                <XCircleIcon className="h-6 w-6"/>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start space-x-4">
                <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
                <div className="w-full">
                    <div className="border border-slate-700 rounded-md">
                        <div className="flex items-center space-x-1 p-2 bg-slate-800 border-b border-slate-700">
                            <button type="button" title="Heading 1" onClick={() => handleFormatClick('formatBlock', '<h1>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H1</button>
                            <button type="button" title="Heading 2" onClick={() => handleFormatClick('formatBlock', '<h2>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H2</button>
                            <button type="button" title="Bold" onClick={() => handleFormatClick('bold')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded w-8">B</button>
                            <button type="button" title="Italic" onClick={() => handleFormatClick('italic')} className="px-2 py-1 text-sm font-bold italic text-gray-300 hover:bg-slate-700 rounded w-8">I</button>
                        </div>
                         <div
                            ref={editorRef}
                            contentEditable="true"
                            onInput={handleInput}
                            data-placeholder={isAdmin ? "Enter your official announcement..." : "Share your thoughts, propose an idea, or post an opportunity..."}
                            className="w-full bg-slate-800 p-3 text-white text-base focus:outline-none wysiwyg-editor"
                            style={{resize: 'vertical', minHeight: '150px', overflowY: 'auto'}}
                        />
                    </div>
                    {!isAdmin && (
                        <div className={`text-right text-xs mt-1 ${ textLength > MAX_POST_LENGTH ? 'text-red-400' : 'text-gray-400'}`}>
                            {textLength} / {MAX_POST_LENGTH}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="pt-2">
                 <p className="text-sm font-medium text-gray-300 mb-3">Categorize your post:</p>
                <div className="flex items-start justify-around space-x-2">
                    <PostTypeButton label="General" icon={<MessageSquareIcon className="h-5 w-5"/>} value="general" currentValue={postType} onClick={setPostType} tooltip="For general announcements, questions, or sharing information with the community."/>
                    <PostTypeButton label="Proposal" icon={<LightbulbIcon className="h-5 w-5"/>} value="proposal" currentValue={postType} onClick={setPostType} tooltip="Suggest a new idea, project, or policy for the commons. This is for starting discussions on community governance and initiatives."/>
                    <PostTypeButton label="Offer" icon={<UsersIcon className="h-5 w-5"/>} value="offer" currentValue={postType} onClick={setPostType} tooltip="Offer a skill, service, or resource to other members. This could be paid or voluntary."/>
                    <PostTypeButton label="Opportunity" icon={<BriefcaseIcon className="h-5 w-5"/>} value="opportunity" currentValue={postType} onClick={setPostType} tooltip="Share a job opening, collaboration request, or other opportunity that members can benefit from."/>
                </div>
            </div>
          </div>
          <div className="bg-slate-800 px-4 py-3 flex justify-end items-center">
            <button
              type="button"
              disabled={isPosting || textLength === 0 || (!isAdmin && textLength > MAX_POST_LENGTH)}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:bg-slate-500"
              onClick={handlePost}
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};