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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { MultiSelectPills } from './MultiSelectPills';
import { SKILLS_LIST } from '../utils';

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
            type="button"
            onClick={() => onClick(value)}
            className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 space-y-2 border-2
                ${currentValue === value 
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-glow-gold' 
                    : 'bg-slate-800 border-white/5 hover:border-white/20 text-gray-500 hover:text-gray-300'}
            `}
        >
            <div className={`${currentValue === value ? 'scale-110' : 'opacity-50'} transition-all`}>
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-black border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-50 text-center">
            {tooltip}
        </div>
    </div>
);

const MAX_POST_LENGTH = 10000;

export const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose, user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [textLength, setTextLength] = useState(0);
  const [postType, setPostType] = useState<PostType>('general');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
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
      setRequiredSkills([]);
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
      await api.createPost(user, content, postType, ccapToAward, requiredSkills);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-90 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <div className="relative bg-slate-950 w-full h-full sm:w-11/12 sm:max-w-4xl sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] shadow-premium flex flex-col transform transition-all animate-fade-in border border-white/10">
          <div className="corner-tl opacity-30"></div><div className="corner-tr opacity-30"></div>
          
          <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center space-x-4">
              {isMobile && (
                <button onClick={onClose} className="text-gray-400 hover:text-brand-gold -ml-1 p-2 bg-white/5 rounded-xl transition-all" aria-label="Back">
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
              )}
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter gold-text leading-none">New Dispatch</h3>
                <p className="label-caps !text-[8px] !text-emerald-500/80 mt-1.5 !tracking-[0.4em]">Protocol Broadcast Mode</p>
              </div>
            </div>
            {!isMobile && (
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-brand-gold transition-all" aria-label="Close">
                <XCircleIcon className="h-8 w-8" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
            <div className="space-y-4">
              <label className="label-caps !text-[10px] text-gray-500 pl-1">Spectrum Classification</label>
              <div className="flex items-start justify-around gap-4">
                <PostTypeButton label="General" icon={<MessageSquareIcon className="h-6 w-6" />} value="general" currentValue={postType} onClick={setPostType} tooltip="Standard community communication. Earns CCAP on impact." />
                <PostTypeButton label="Proposal" icon={<LightbulbIcon className="h-6 w-6" />} value="proposal" currentValue={postType} onClick={setPostType} tooltip="System improvement suggestion. Higher CCAP potential." />
                <PostTypeButton label="Offer" icon={<UsersIcon className="h-6 w-6" />} value="offer" currentValue={postType} onClick={setPostType} tooltip="Skill or resource availability for citizens." />
                <PostTypeButton label="Opportunity" icon={<BriefcaseIcon className="h-6 w-6" />} value="opportunity" currentValue={postType} onClick={setPostType} tooltip="Job or collaboration nodes requiring skills." />
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <UserCircleIcon className="h-8 w-8 text-gray-700" />
              </div>
              <div className="w-full space-y-4">
                <div className="module-frame bg-slate-950 border border-white/10 rounded-[2rem] overflow-hidden focus-within:border-brand-gold/40 transition-all shadow-inner">
                  <div className="flex items-center space-x-2 p-3 bg-white/5 border-b border-white/5">
                    <button type="button" title="Bold" onClick={() => handleFormatClick('bold')} className="p-2 text-xs font-black uppercase text-gray-500 hover:text-brand-gold transition-all">Bold</button>
                    <button type="button" title="Italic" onClick={() => handleFormatClick('italic')} className="p-2 text-xs font-black uppercase text-gray-500 hover:text-brand-gold transition-all">Italic</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable="true"
                    onInput={handleInput}
                    data-placeholder={"Enter protocol transmission data..."}
                    className="w-full bg-slate-950 p-6 text-gray-200 text-lg focus:outline-none wysiwyg-editor min-h-[250px] leading-relaxed"
                  />
                </div>
                <div className={`text-right text-[10px] font-black font-mono tracking-widest ${textLength > MAX_POST_LENGTH ? 'text-red-500' : 'text-gray-700'}`}>
                  {textLength.toLocaleString()} / {MAX_POST_LENGTH.toLocaleString()} OCTETS
                </div>
              </div>
            </div>
            
            {postType === 'opportunity' && (
                <div className="animate-fade-in module-frame glass-module p-8 rounded-[2.5rem] border-white/5 space-y-6 shadow-xl">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Collaboration Matching Protocol</h4>
                    </div>
                    <MultiSelectPills
                        label="Required Node Capabilities"
                        options={SKILLS_LIST}
                        selected={requiredSkills}
                        onChange={setRequiredSkills}
                        minSelection={1}
                        maxSelection={5}
                    />
                </div>
            )}

            {evaluation && (
                <div className={`p-8 rounded-[2.5rem] border-2 animate-fade-in flex flex-col md:flex-row gap-8 items-center ${evaluation.impactScore >= 7 ? 'bg-emerald-950/10 border-emerald-500/30' : 'bg-red-950/10 border-red-500/30'}`}>
                    <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl shrink-0 ${evaluation.impactScore >= 7 ? 'bg-emerald-500 text-slate-950 shadow-glow-matrix' : 'bg-red-500 text-white shadow-red-900/50'}`}>
                        <span className="text-3xl font-black font-mono leading-none">{evaluation.impactScore}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Impact</span>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                             {evaluation.impactScore >= 7 ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" /> : <AlertTriangleIcon className="h-5 w-5 text-red-500" />}
                             Oracle Impact Verification
                        </h4>
                        <p className="text-sm text-gray-400 italic leading-relaxed">"{evaluation.reasoning}"</p>
                        {evaluation.impactScore < 7 && (
                             <p className="text-xs text-red-400/80 font-bold uppercase tracking-wide mt-4 border-t border-red-500/20 pt-4">Suggestions: {evaluation.suggestionsForImprovement}</p>
                        )}
                    </div>
                </div>
            )}
          </div>

          <div className="bg-slate-900/80 border-t border-white/5 p-6 sm:px-10 flex flex-col sm:flex-row justify-end items-center gap-4 flex-shrink-0">
            <button
              onClick={() => handlePost(true)}
              disabled={isPosting || isEvaluating || textLength === 0}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all"
            >
              Dispatch Pure
            </button>

            {evaluation && evaluation.impactScore >= 7 ? (
              <button
                onClick={() => handlePost(false)}
                disabled={isPosting}
                className="w-full sm:w-auto px-10 py-4 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isPosting ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <><DatabaseIcon className="h-4 w-4"/> Anchor +{evaluation.ccapAward} CCAP</>}
              </button>
            ) : (
              <button
                onClick={handleEvaluate}
                disabled={isEvaluating || textLength === 0}
                className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-matrix transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isEvaluating ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <><SparkleIcon className="h-5 w-5"/> Evaluate Node Impact</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};