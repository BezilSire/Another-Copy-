import React, { useState } from 'react';
import { SirenIcon } from './icons/SirenIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { User } from '../types';
import { distressService } from '../services/distressService';
import { useToast } from '../contexts/ToastContext';

interface DistressCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

export const DistressCallModal: React.FC<DistressCallModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'form'>('confirm');
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      addToast("Please provide a brief message about your situation.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await distressService.sendDistressCall(user, message);
      addToast("Distress call sent. Admins have been notified.", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      addToast(error.message || "Failed to send distress call.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-midnight-light border border-red-500/30 rounded-[2.5rem] p-8 max-w-md w-full shadow-premium relative overflow-hidden">
        <div className="corner-tl !border-red-500/40"></div><div className="corner-tr !border-red-500/40"></div><div className="corner-bl !border-red-500/40"></div><div className="corner-br !border-red-500/40"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-xl border border-red-500/30 animate-pulse">
              <SirenIcon className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Distress Call</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {step === 'confirm' ? (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-2">Warning: Emergency Use Only</p>
              <p className="text-white/70 text-sm font-medium leading-relaxed">
                This feature is strictly for members in genuine distress. Misuse of this system will result in immediate suspension of your account and loss of credibility.
              </p>
            </div>
            
            <p className="text-white/60 text-xs font-medium italic">
              You have <span className="text-white font-bold">{user.distress_calls_available}</span> distress calls available.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('form')}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
              >
                I Understand, Continue
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all active:scale-[0.98] border border-white/5 uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps !mb-1">Briefly describe your situation</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Medical emergency, security threat, or urgent need..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-medium focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all outline-none resize-none h-32"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Distress Call'
                )}
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={isSubmitting}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all active:scale-[0.98] border border-white/5 uppercase tracking-widest text-[10px]"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
