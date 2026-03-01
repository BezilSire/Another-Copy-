import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-midnight flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-midnight-light border border-white/10 rounded-[3rem] p-10 shadow-premium relative overflow-hidden">
            <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl border-2 border-red-500/30 flex items-center justify-center mb-8 shadow-glow-red">
                <AlertTriangleIcon className="h-10 w-10 text-red-500" />
              </div>
              
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-4">Protocol Fault</h2>
              <p className="text-sm font-medium text-white/50 leading-relaxed mb-10 uppercase tracking-widest">
                An unexpected state has been detected in the node.
              </p>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full py-6 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all active:scale-[0.98] border border-white/10 flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-[11px]"
              >
                <RotateCwIcon className="h-5 w-5" />
                Reboot Node
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
