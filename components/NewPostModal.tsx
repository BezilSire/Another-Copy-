import React, { useState, useRef, useEffect } from 'react';
import { User, Post } from '../types';
import { api } from '../services/apiService';
import { evaluatePostImpact } from '../services/geminiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { UsersIcon } from './icons/UsersIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onPostCreated: (ccapAwarded: number) => void;
}

type PostType = 'general' | 'proposal' | 'offer' | 'opportunity';

interface EvaluationResult {
    impactScore: number;
    reasoning: string;
    suggestionsForImprovement: string;
    ccapAward: number;
}

const PostTypeButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    value: PostType;
    currentValue: PostType;
    onClick: (value: PostType) => void;
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

const MAX_POST_LENGTH = 1000;

export const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose, user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [textLength, setTextLength] = useState(0);
  const [postType, setPostType] = useState<PostType>('general');
  const [isPosting, setIsPosting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'admin';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setTextLength(0);
      setPostType('general');
      setEvaluation(null);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setTimeout(() => editorRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  if (!isOpen) {
    return null;
  }
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const html = e.currentTarget.innerHTML;
      const text = e.currentTarget.textContent || '';
      setContent(html);
      setTextLength(text.length);
      // Reset evaluation if user edits content after evaluation
      if (evaluation) {
          setEvaluation(null);
      }
  };

  const handleEvaluate = async () => {
      if (textLength === 0) return;
      setIsEvaluating(true);
      setEvaluation(null);
      try {
          const result = await evaluatePostImpact(editorRef.current?.textContent || '', postType);
          setEvaluation(result);
      } catch (e) {
          console.error("Evaluation failed:", e);
      } finally {
          setIsEvaluating(false);
      }
  }

  const handlePost = async (bypass: boolean = false) => {
    if (!bypass && (!evaluation || evaluation.impactScore < 7)) return;
    
    setIsPosting(true);
    try {
      const ccapToAward = bypass ? 0 : evaluation?.ccapAward || 0;
      await api.createPost(user, content, postType, ccapToAward);
      onPostCreated(ccapToAward);
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleFormatClick = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
        const event = new Event('input', { bubbles: true });
        editorRef.current.dispatchEvent(event);
    }
  };

  const EvaluationResultDisplay = () => {
    if (!evaluation) return null;
    const isApproved = evaluation.impactScore >= 7;

    return (
        <div className={`mt-4 p-4 rounded-lg border ${isApproved ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'} animate-fade-in`}>
            <div className="flex items-center gap-4">
                 <div className={`flex flex-col items-center justify-center h-20 w-20 rounded-full ${isApproved ? 'bg-green-500' : 'bg-yellow-500'}`}>
                    <span className="text-3xl font-bold text-slate-900">{evaluation.impactScore}<span className="text-lg">/10</span></span>
                    <span className="text-xs font-semibold text-slate-800">Impact Score</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                         {isApproved ? <CheckCircleIcon className="h-5 w-5 text-green-400"/> : <AlertTriangleIcon className="h-5 w-5 text-yellow-400"/>}
                        <h4 className="font-semibold text-white">{isApproved ? "Impact Analysis: Approved" : "Impact Analysis: Needs Improvement"}</h4>
                    </div>
                    <p className="text-sm text-gray-300 italic">"{evaluation.reasoning}"</p>
                </div>
            </div>
            {!isApproved && evaluation.suggestionsForImprovement && (
                 <div className="mt-4 pt-3 border-t border-yellow-700/50">
                    <h5 className="font-semibold text-yellow-300">Suggestions for Improvement:</h5>
                    <p className="text-sm text-yellow-200 whitespace-pre-line mt-1">{evaluation.suggestionsForImprovement}</p>
                 </div>
            )}
        </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <div className="relative bg-slate-900 w-full h-full sm:w-11/12 sm:max-w-4xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg shadow-xl flex flex-col transform transition-all animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center space-x-2">
              {isMobile && (
                <button onClick={onClose} className="text-gray-400 hover:text-white -ml-1 mr-2 p-1" aria-label="Back">
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
              )}
              <h3 className="text-lg font-bold text-white">Create a Post</h3>
            </div>
            {!isMobile && (
              <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
                <XCircleIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    data-placeholder={"Share your thoughts, propose an idea, or post an opportunity..."}
                    className="w-full bg-slate-800 p-3 text-white text-base focus:outline-none wysiwyg-editor"
                    style={{ resize: 'vertical', minHeight: '200px', overflowY: 'auto' }}
                  />
                </div>
                <div className={`text-right text-xs mt-1 ${textLength > MAX_POST_LENGTH ? 'text-red-400' : 'text-gray-400'}`}>
                  {textLength} / {MAX_POST_LENGTH}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium text-gray-300 mb-3">Categorize your post:</p>
              <div className="flex items-start justify-around space-x-2">
                <PostTypeButton label="General" icon={<MessageSquareIcon className="h-5 w-5" />} value="general" currentValue={postType} onClick={setPostType} tooltip="General discussion. Earns CCAP based on impact." />
                <PostTypeButton label="Proposal" icon={<LightbulbIcon className="h-5 w-5" />} value="proposal" currentValue={postType} onClick={setPostType} tooltip="Suggest an idea for the commons. Earns CCAP based on impact." />
                <PostTypeButton label="Offer" icon={<UsersIcon className="h-5 w-5" />} value="offer" currentValue={postType} onClick={setPostType} tooltip="Offer a skill or service. Earns CCAP based on impact." />
                <PostTypeButton label="Opportunity" icon={<BriefcaseIcon className="h-5 w-5" />} value="opportunity" currentValue={postType} onClick={setPostType} tooltip="Share a job or collaboration. Earns CCAP based on impact." />
              </div>
            </div>
            <EvaluationResultDisplay />
          </div>

          {/* Footer */}
          <div className="bg-slate-800 px-4 py-3 flex justify-end items-center gap-4 border-t border-slate-700 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={() => handlePost(true)}
                disabled={isPosting || isEvaluating || textLength === 0}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-50"
              >
                Post without evaluation (Admin)
              </button>
            )}
            {evaluation && evaluation.impactScore >= 7 ? (
              <button
                onClick={() => handlePost(false)}
                disabled={isPosting}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 disabled:bg-slate-500"
              >
                {isPosting ? 'Posting...' : `Post to Feed (+${evaluation.ccapAward} CCAP)`}
              </button>
            ) : (
              <button
                onClick={handleEvaluate}
                disabled={isEvaluating || textLength === 0 || textLength > MAX_POST_LENGTH}
                className="inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 disabled:bg-slate-500"
              >
                {isEvaluating ? <><LoaderIcon className="h-5 w-5 animate-spin mr-2" />Evaluating...</> : evaluation ? 'Re-evaluate' : <><SparkleIcon className="h-5 w-5 mr-2" />Evaluate Impact</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};