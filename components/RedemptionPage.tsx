import React, { useState, useEffect } from 'react';
import { MemberUser, RedemptionCycle, User, Venture } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface RedemptionPageProps {
  user: MemberUser;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onBack: () => void;
}

const ChoiceCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = ({ title, description, icon, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="bg-slate-800 p-6 rounded-lg text-left w-full h-full flex flex-col justify-between border border-slate-700 hover:border-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700"
    >
        <div>
            <div className="flex items-center space-x-4">
                <div className="bg-slate-700 p-3 rounded-full">{icon}</div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-400 mt-3">{description}</p>
        </div>
    </button>
);

export const RedemptionPage: React.FC<RedemptionPageProps> = ({ user, onUpdateUser, onBack }) => {
    const [cycle, setCycle] = useState<RedemptionCycle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modal, setModal] = useState<'redeem' | 'stake' | 'invest' | null>(null);
    const [payoutData, setPayoutData] = useState({ ecocashName: '', ecocashNumber: '' });
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [selectedVenture, setSelectedVenture] = useState<Venture | null>(null);
    const { addToast } = useToast();

    const ccapToRedeem = user.currentCycleCcap || 0;
    const usdtValue = cycle ? ccapToRedeem * cycle.ccap_to_usd_rate : 0;
    const hasMadeChoice = !!user.lastCycleChoice;

    useEffect(() => {
        Promise.all([
            api.getCurrentRedemptionCycle(),
            api.getFundraisingVentures()
        ]).then(([cycleData, ventureData]) => {
            setCycle(cycleData);
            setVentures(ventureData);
        }).catch(err => {
            addToast('Could not load redemption data.', 'error');
        }).finally(() => {
            setIsLoading(false);
        });
    }, [addToast]);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (!cycle) {
                throw new Error("Redemption cycle not loaded.");
            }
            await api.redeemCcapForCash(user, payoutData.ecocashName, payoutData.ecocashNumber, usdtValue, ccapToRedeem, cycle.ccap_to_usd_rate);
            await onUpdateUser({ lastCycleChoice: 'redeemed' });
            addToast('Redemption request submitted!', 'success');
            setModal(null);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Redemption failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleStake = async () => {
        setIsProcessing(true);
        try {
            await api.stakeCcapForNextCycle(user);
            await onUpdateUser({ stakedCcap: (user.stakedCcap || 0) + (ccapToRedeem * 1.1), currentCycleCcap: 0, lastCycleChoice: 'staked' });
            addToast('CCAP staked successfully! You get a 10% bonus for the next cycle.', 'success');
            setModal(null);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Staking failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInvest = async () => {
        if (!selectedVenture || !cycle) return;
        setIsProcessing(true);
        try {
            await api.convertCcapToVeq(user, selectedVenture, ccapToRedeem, cycle.ccap_to_usd_rate);
            // The onUpdateUser will be slow, so we can optimistically update or just wait.
            // For now, let's just show success and let the main user object refresh.
            await onUpdateUser({}); // Trigger a refetch
            addToast(`Successfully invested in ${selectedVenture.name}!`, 'success');
            setModal(null);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Investment failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <div className="text-center p-10"><LoaderIcon className="h-8 w-8 animate-spin mx-auto text-green-500" /></div>;
    if (!cycle) return <div className="text-center p-10">Redemption cycle data is unavailable.</div>;

    const renderChoiceConfirmation = () => (
        <div className="text-center bg-slate-800 p-8 rounded-lg animate-fade-in">
            <CheckCircleIcon className="h-16 w-16 mx-auto text-green-400" />
            <h2 className="text-2xl font-bold text-white mt-4">Your Choice is Locked In!</h2>
            <p className="text-gray-300 mt-2">You have chosen to <strong className="text-white">{user.lastCycleChoice}</strong> your CCAP for this cycle. Your action strengthens the commons.</p>
            <p className="text-sm text-gray-400 mt-4">The next redemption cycle begins on {cycle.endDate.toDate().toLocaleDateString()}.</p>
        </div>
    );

    const renderRedemptionWindow = () => (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChoiceCard title="Redeem to Ecocash" description={`Instantly convert your ${ccapToRedeem} CCAP into ≈$${usdtValue.toFixed(2)} USDT and withdraw to your Ecocash account.`} icon={<DollarSignIcon className="h-6 w-6 text-green-400"/>} onClick={() => setModal('redeem')} />
            <ChoiceCard title="Stake for Bonus" description={`Stake your ${ccapToRedeem} CCAP and receive a 10% bonus for the next cycle. Your stake will become ~${Math.floor(ccapToRedeem * 1.1)} CCAP.`} icon={<TrendingUpIcon className="h-6 w-6 text-blue-400"/>} onClick={() => setModal('stake')} />
            <ChoiceCard title="Convert to VEQ" description="Convert your CCAP into an ownership stake (Venture Equity) in a community-led business. This consumes your CCAP for this cycle and gives you shares that can provide long-term returns." icon={<BriefcaseIcon className="h-6 w-6 text-yellow-400"/>} onClick={() => setModal('invest')} />
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={onBack} className="inline-flex items-center text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Earn Page
            </button>

            <div className="text-center bg-slate-900/50 p-8 rounded-lg">
                <p className="text-sm font-semibold text-green-400 uppercase tracking-wider">Your Value This Cycle</p>
                <p className="text-6xl font-bold text-white my-2">{ccapToRedeem.toLocaleString()}<span className="text-4xl text-gray-400 ml-2">CCAP</span></p>
                <p className="text-2xl font-semibold text-gray-200">≈ ${usdtValue.toFixed(2)} <span className="text-lg text-gray-400">USDT</span></p>
                <p className="text-xs text-gray-500 mt-2">Based on a Community Value Pool of ${cycle.cvp_usd_total.toLocaleString()} and a total of {cycle.total_ccap_earned.toLocaleString()} CCAP earned this cycle.</p>
            </div>

            {hasMadeChoice ? renderChoiceConfirmation() : renderRedemptionWindow()}
            
            {/* Modals */}
            {modal === 'redeem' && (
                <ConfirmationModal title="Redeem to Ecocash" onClose={() => setModal(null)} isProcessing={isProcessing} onConfirm={handleRedeem} confirmText="Submit Request">
                    <form onSubmit={handleRedeem} className="space-y-4">
                        <p className="text-sm text-gray-300">You are requesting to convert <strong className="text-white">{ccapToRedeem} CCAP</strong> to <strong className="text-white">${usdtValue.toFixed(2)} USDT</strong>. Please provide your Ecocash details below.</p>
                        <div>
                            <label htmlFor="ecocashName" className="block text-sm font-medium text-gray-300">Ecocash Full Name</label>
                            <input type="text" id="ecocashName" value={payoutData.ecocashName} onChange={e => setPayoutData(p => ({...p, ecocashName: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                        <div>
                            <label htmlFor="ecocashNumber" className="block text-sm font-medium text-gray-300">Ecocash Phone Number</label>
                            <input type="tel" id="ecocashNumber" value={payoutData.ecocashNumber} onChange={e => setPayoutData(p => ({...p, ecocashNumber: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                    </form>
                </ConfirmationModal>
            )}
             {modal === 'stake' && (
                <ConfirmationModal title="Confirm Staking" onClose={() => setModal(null)} isProcessing={isProcessing} onConfirm={handleStake} confirmText="Yes, Stake my CCAP">
                    <p className="text-sm text-gray-300">Are you sure you want to stake your <strong className="text-white">{ccapToRedeem} CCAP</strong>? You will receive a 10% bonus, making your contribution for the next cycle worth approximately <strong className="text-white">{Math.floor(ccapToRedeem * 1.1)} CCAP</strong>.</p>
                </ConfirmationModal>
            )}
            {modal === 'invest' && (
                <ConfirmationModal title="Convert to Venture Equity" onClose={() => setModal(null)} isProcessing={isProcessing} onConfirm={handleInvest} confirmText={`Invest in ${selectedVenture?.name}`} disabled={!selectedVenture}>
                     <p className="text-sm text-gray-300 mb-4">Select a fundraising venture to convert your <strong className="text-white">${usdtValue.toFixed(2)} USDT</strong> worth of CCAP into an ownership stake.</p>
                     <div className="space-y-2">
                        {ventures.length > 0 ? ventures.map(v => (
                            <button key={v.id} onClick={() => setSelectedVenture(v)} className={`w-full text-left p-3 rounded-md border-2 ${selectedVenture?.id === v.id ? 'border-green-500 bg-slate-700' : 'border-slate-600 bg-slate-900 hover:bg-slate-700'}`}>
                                <p className="font-semibold text-white">{v.name}</p>
                                <p className="text-xs text-gray-400">{v.description}</p>
                            </button>
                        )) : <p className="text-center text-gray-400">No ventures are currently fundraising.</p>}
                     </div>
                </ConfirmationModal>
            )}
        </div>
    );
};

// Generic Modal Component
const ConfirmationModal: React.FC<{
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    isProcessing: boolean;
    onConfirm: (e: any) => void;
    confirmText: string;
    disabled?: boolean;
}> = ({ title, onClose, children, isProcessing, onConfirm, confirmText, disabled }) => (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
            <div className="inline-block bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full z-10">
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-white" id="modal-title">{title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="mt-4">{children}</div>
                </div>
                <div className="bg-slate-900/50 px-6 py-3 flex flex-row-reverse">
                    <button onClick={onConfirm} disabled={isProcessing || disabled} className="inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
                        {isProcessing ? 'Processing...' : confirmText}
                    </button>
                    <button onClick={onClose} className="mr-3 inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
                </div>
            </div>
        </div>
    </div>
);