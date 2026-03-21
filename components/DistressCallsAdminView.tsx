import React, { useState, useEffect } from 'react';
import { DistressCall } from '../types';
import { distressService } from '../services/distressService';
import { useToast } from '../contexts/ToastContext';
import { SirenIcon } from './icons/SirenIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';

export const DistressCallsAdminView: React.FC = () => {
  const [calls, setCalls] = useState<DistressCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = distressService.listenForDistressCalls((data) => {
      setCalls(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async (callId: string, status: 'resolved' | 'dismissed') => {
    try {
      await distressService.resolveDistressCall(callId, status);
      addToast(`Distress call ${status}.`, "success");
    } catch (error) {
      addToast("Failed to update distress call.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Distress Calls</h2>
          <p className="text-slate-400 text-sm font-medium">Monitor and respond to emergency alerts from the community.</p>
        </div>
        <div className="bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
          <p className="text-red-500 text-xs font-black uppercase tracking-widest">
            {calls.filter(c => c.status === 'pending').length} Active Alerts
          </p>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="pro-card p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-white/40 font-medium tracking-tight">No distress calls recorded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {calls.map((call) => (
            <div 
              key={call.id} 
              className={`pro-card p-6 border-l-4 transition-all ${
                call.status === 'pending' ? 'border-l-red-500 bg-red-500/5' : 
                call.status === 'resolved' ? 'border-l-emerald-500' : 'border-l-slate-700 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${call.status === 'pending' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                      <SirenIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{call.userName}</h4>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">{call.userEmail}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto md:ml-0 px-2 py-1 bg-white/5 rounded-full border border-white/5">
                      <ClockIcon className="h-3 w-3 text-white/40" />
                      <span className="text-[10px] text-white/40 font-bold">
                        {call.timestamp?.toDate ? call.timestamp.toDate().toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-white/80 text-sm leading-relaxed italic">"{call.message}"</p>
                  </div>

                  {call.location && (
                    <div className="flex items-center gap-2 text-[10px] text-brand-gold font-bold uppercase tracking-widest">
                      <GlobeIcon className="h-3 w-3" />
                      Location: {call.location.latitude.toFixed(4)}, {call.location.longitude.toFixed(4)}
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col gap-2 justify-end">
                  {call.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleResolve(call.id, 'resolved')}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="h-3 w-3" />
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleResolve(call.id, 'dismissed')}
                        className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircleIcon className="h-3 w-3" />
                        Dismiss
                      </button>
                    </>
                  )}
                  {call.status !== 'pending' && (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${
                      call.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {call.status}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper icon for location
const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
