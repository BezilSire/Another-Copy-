
import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile, FilterType, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { PostsFeed } from './PostsFeed';
import { MemberCard } from './MemberCard';
import { FlagIcon } from './icons/FlagIcon';
import { ReportUserModal } from './ReportUserModal';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface PublicProfileProps {
  userId: string;
  currentUser: User;
  onBack: () => void;
  onStartChat: (targetUserId: string) => void;
  onViewProfile: (userId: string) => void;
  isAdminView?: boolean;
}

const DetailItem: React.FC<{label: string, value: string | undefined}> = ({label, value}) => (
    <div>
        <dt className="label-caps !text-[8px] text-gray-500 mb-1">{label}</dt>
        <dd className="text-white font-bold">{value || <span className="text-gray-600 italic">Not indexed</span>}</dd>
    </div>
);

const Pill: React.FC<{text: string}> = ({ text }) => (
    <span className="inline-block bg-slate-900 border border-white/5 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-gray-400 mr-2 mb-2 tracking-widest">
        {text}
    </span>
);

export const PublicProfile: React.FC<PublicProfileProps> = ({ userId, currentUser, onBack, onStartChat, onViewProfile, isAdminView = false }) => {
    const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isVouching, setIsVouching] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'about' | 'card' | 'venture'>('activity');
    // FIX: Added missing typeFilter state variable to resolve reference error on line 190
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const { addToast } = useToast();

    useEffect(() => {
        setPublicProfile(null);
        setIsLoading(true);
        const fetchProfileData = async () => {
            try {
                const profileData = isAdminView ? await api.getUser(userId) : await api.getPublicUserProfile(userId);
                if (profileData) setPublicProfile(profileData);
                else addToast("Node not found.", "error");
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, [userId, isAdminView]); 
    
    const handleVouch = async () => {
        if (!publicProfile || isVouching) return;
        if (!cryptoService.hasVault()) {
            addToast("IDENTITY_BREACH: Local vault required to sign vouches.", "error");
            return;
        }

        setIsVouching(true);
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payload = `VOUCH:${currentUser.id}:${publicProfile.id}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);
            const txId = `vouch-${Date.now().toString(36)}`;

            const transaction: UbtTransaction = {
                id: txId,
                senderId: currentUser.id,
                receiverId: publicProfile.id,
                amount: 0,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payload,
                senderPublicKey: currentUser.publicKey || "",
                parentHash: 'SOCIAL_CHAIN',
                type: 'VOUCH_ANCHOR',
                protocol_mode: 'MAINNET'
            };

            await api.vouchForCitizen(transaction);
            addToast(`Identity Anchored. Verified peer-trust signed for ${publicProfile.name}.`, "success");
            setPublicProfile(prev => prev ? ({ ...prev, credibility_score: (prev.credibility_score || 0) + 5, vouchCount: (prev.vouchCount || 0) + 1 }) : null);
        } catch (e: any) {
            addToast(e.message || "Signed handshake aborted.", "error");
        } finally {
            setIsVouching(false);
        }
    };

    const handleReportSubmit = async (reason: string, details: string) => {
        if (!publicProfile) return;
        try {
            await api.reportUser(currentUser, publicProfile as any, reason, details);
            addToast("Evidence buffered for admin review.", "success");
        } catch (error) {
            addToast("Transmission failed.", "error");
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-30" /></div>;

    if (!publicProfile) return <div className="p-10 text-center uppercase tracking-widest text-gray-500">Identity Offline</div>;
    
    const skillsArray = Array.isArray(publicProfile.skills) ? publicProfile.skills : [];
    const isOwnProfile = publicProfile.id === currentUser.id;

    return (
        <div className="animate-fade-in pb-20 max-w-4xl mx-auto font-sans">
             <ReportUserModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reportedUser={publicProfile as User} onReportSubmit={handleReportSubmit} />
            
            <button onClick={onBack} className="inline-flex items-center mb-8 text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] hover:text-white transition-colors">
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> Return to Spectrum
            </button>
            
            <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/5 shadow-premium overflow-hidden">
                <div className="corner-tl opacity-30"></div><div className="corner-tr opacity-30"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/[0.03] to-transparent pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 border border-brand-gold/30 flex items-center justify-center shadow-2xl relative">
                            <UserCircleIcon className="h-16 w-16 sm:h-20 sm:w-20 text-gray-700" />
                            <div className="absolute -bottom-2 -right-2 bg-brand-gold text-slate-950 p-2 rounded-xl shadow-glow-gold">
                                <ShieldCheckIcon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter gold-text leading-none">{publicProfile.name}</h2>
                            <p className="text-xl font-black text-emerald-400 tracking-tight uppercase">{publicProfile.profession || "Citizen Node"}</p>
                            <div className="flex items-center gap-4 pt-4">
                                <div className="text-center bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{publicProfile.credibility_score || 100}</p>
                                    <p className="text-[7px] text-gray-700 font-black uppercase tracking-[0.2em]">Reputation</p>
                                </div>
                                <div className="text-center bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{publicProfile.vouchCount || 0}</p>
                                    <p className="text-[7px] text-gray-700 font-black uppercase tracking-[0.2em]">Signed Vouches</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                     <div className="flex flex-col gap-3 w-full lg:w-64">
                        {!isOwnProfile && (
                            <>
                                <button 
                                    onClick={handleVouch}
                                    disabled={isVouching}
                                    className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-glow-gold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isVouching ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><ShieldCheckIcon className="h-4 w-4" /> Sign Vouch Anchor</>}
                                </button>
                                <button onClick={() => onStartChat(publicProfile.id)} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">Direct Comm Channel</button>
                                <button onClick={() => setIsReportModalOpen(true)} className="w-full py-2 text-[8px] font-black text-gray-700 hover:text-red-500 uppercase tracking-[0.3em] transition-colors">Flag Anomoly</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-12">
                <nav className="flex space-x-12 border-b border-white/10 overflow-x-auto no-scrollbar">
                    {['activity', 'about', 'card', 'venture'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === tab ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold shadow-glow-gold"></div>}
                        </button>
                    ))}
                </nav>

                <div className="mt-10">
                    {activeTab === 'activity' && <PostsFeed user={currentUser} authorId={publicProfile.id} onViewProfile={onViewProfile} typeFilter={typeFilter} />}
                    {activeTab === 'about' && (
                        <div className="module-frame glass-module p-10 rounded-[2.5rem] border-white/5 animate-fade-in space-y-10">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                <DetailItem label="Operational Circle" value={publicProfile.circle} />
                                <DetailItem label="Protocol Alignment" value={publicProfile.status} />
                                <DetailItem label="Joined Cycle" value={publicProfile.createdAt?.toDate().toLocaleDateString()} />
                             </div>
                             <div className="border-t border-white/5 pt-10">
                                <p className="label-caps !text-[8px] text-gray-500 mb-4">Bio Stream</p>
                                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{publicProfile.bio || 'No public narrative provided.'}</p>
                             </div>
                             {skillsArray.length > 0 && (
                                <div className="border-t border-white/5 pt-10">
                                    <p className="label-caps !text-[8px] text-gray-500 mb-4">Node Capability Tags</p>
                                    <div className="flex flex-wrap">{skillsArray.map(skill => <Pill key={skill} text={skill} />)}</div>
                                </div>
                             )}
                        </div>
                    )}
                    {activeTab === 'card' && <MemberCard user={publicProfile} />}
                </div>
            </div>
        </div>
    );
};
