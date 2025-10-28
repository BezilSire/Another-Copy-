import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSave: (postId: string, newContent: string) => Promise<void>;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, post, onSave }) => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const sanitizeHtml = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('style');
    });
    return tempDiv.innerHTML;
  };

  useEffect(() => {
    if (isOpen && post) {
      const sanitizedContent = sanitizeHtml(post.content);
      setContent(sanitizedContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitizedContent;
      }
    }
  }, [isOpen, post]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        document.execCommand('insertText', false, text);
      }
    };

    editor.addEventListener('paste', handlePaste);
    return () => {
      editor.removeEventListener('paste', handlePaste);
    };
  }, [isOpen]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setContent(e.currentTarget.innerHTML);
  };

  const handleFormatClick = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current?.textContent?.trim()) return;
    setIsSaving(true);
    await onSave(post.id, content);
    setIsSaving(false); // Parent will close, but good practice to reset
  };

  if (!isOpen) {
    return null;
  }

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
              <div className="border border-slate-700 rounded-md">
                <div className="flex items-center space-x-1 p-2 bg-slate-900 border-b border-slate-700">
                  <button type="button" title="Heading 1" onClick={() => handleFormatClick('formatBlock', '<h1>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H1</button>
                  <button type="button" title="Heading 2" onClick={() => handleFormatClick('formatBlock', '<h2>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H2</button>
                  <button type="button" title="Bold" onClick={() => handleFormatClick('bold')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded w-8">B</button>
                  <button type="button" title="Italic" onClick={() => handleFormatClick('italic')} className="px-2 py-1 text-sm font-bold italic text-gray-300 hover:bg-slate-700 rounded w-8">I</button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable="true"
                  onInput={handleInput}
                  className="w-full bg-slate-800 p-3 text-white text-base focus:outline-none wysiwyg-editor"
                  style={{ minHeight: '150px', maxHeight: '40vh', overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
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
