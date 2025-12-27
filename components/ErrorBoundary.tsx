import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary catches rendering errors in its child component tree.
 * Explicitly extending React.Component ensures that setState and props are correctly identified.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // Inherited method from React.Component
  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Update the local state with error details
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    window.location.reload();
  };

  // Inherited method from React.Component
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-brand-gold/30">
          <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
          
          <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-red-500/20 shadow-premium max-w-lg w-full relative overflow-hidden animate-fade-in">
            <div className="corner-tl !border-red-500/40"></div><div className="corner-tr !border-red-500/40"></div>
            
            <div className="w-24 h-24 bg-red-500/10 rounded-full border-2 border-red-500/20 flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_-10px_rgba(239,68,68,0.3)]">
                <AlertTriangleIcon className="h-12 w-12 text-red-500 animate-pulse" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">Protocol Breach</h2>
            <p className="label-caps !text-[10px] !text-red-500/80 mb-8 !tracking-[0.4em]">Critical System Exception Detected</p>
            
            <div className="bg-black/60 p-6 rounded-3xl border border-white/5 shadow-inner mb-10 text-left overflow-hidden">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">Diagnostic_Trace</p>
                <p className="data-mono text-[11px] text-red-400/80 break-words leading-relaxed">
                    {this.state.error?.name}: {this.state.error?.message}
                </p>
            </div>

            <div className="flex flex-col gap-4">
                <button 
                    onClick={this.handleReset}
                    className="w-full py-6 bg-white text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3"
                >
                    <RotateCwIcon className="h-5 w-5" /> Reset Protocol State
                </button>
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-4">
                    Identity state is preserved in local vault. Reloading will re-anchor the node.
                </p>
            </div>
          </div>
          
          <div className="absolute bottom-10 opacity-20 flex items-center gap-3 grayscale pointer-events-none">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.6em]">Ubuntium_Kernel_Panic_Handled</span>
          </div>
        </div>
      );
    }

    // Accesses props correctly from React.Component inheritance
    return this.props.children;
  }
}
