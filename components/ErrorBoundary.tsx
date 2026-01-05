import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Sovereign Error Boundary - Protocol Breach Containment
 */
/* Fix: Explicitly extend React.Component and ensure state is correctly handled */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  /* Capture lifecycle errors and trigger the error state */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Handshake Failure Exception:', error, errorInfo);
    /* Fix: setState is now correctly identified via React.Component extension */
    this.setState({ 
      hasError: true,
      error, 
      errorInfo 
    });
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    /* Fix: state is now correctly identified via React.Component extension */
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-red-500/20 shadow-premium max-w-lg w-full relative overflow-hidden animate-fade-in">
            <div className="w-24 h-24 bg-red-500/10 rounded-full border-2 border-red-500/20 flex items-center justify-center mx-auto mb-10">
                <AlertTriangleIcon className="h-12 w-12 text-red-500 animate-pulse" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">Protocol Breach</h2>
            <p className="label-caps !text-[10px] !text-red-500/80 mb-8 !tracking-[0.4em]">Critical System Exception Detected</p>
            
            <div className="bg-black/60 p-6 rounded-3xl border border-white/5 shadow-inner mb-10 text-left overflow-hidden">
                <p className="data-mono text-[11px] text-red-400/80 break-words leading-relaxed">
                    {error?.name}: {error?.message}
                </p>
            </div>

            <button 
                onClick={this.handleReset}
                className="w-full py-6 bg-white text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3"
            >
                <RotateCwIcon className="h-4 w-4" /> Reset Protocol State
            </button>
          </div>
        </div>
      );
    }

    /* Fix: props is now correctly identified via React.Component extension */
    return this.props.children;
  }
}