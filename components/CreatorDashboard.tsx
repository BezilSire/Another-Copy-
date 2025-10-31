import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Creator, User, PublicUserProfile, PayoutRequest, CreatorContent } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { formatTimeAgo } from '../utils';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrashIcon } from './icons/TrashIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ConfirmationDialog } from './ConfirmationDialog';

interface CreatorDashboardProps {
  user: Creator;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
}

type CreatorView = 'dashboard' | 'circle' | 'content' | 'payouts';

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; }> = ({ icon, title, value }) => (
  <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex items-start">
    <div className="flex-shrink-0 bg-slate-700 rounded-md p-3">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-400 truncate">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`${isActive ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
        <span className="mr-2 h-5 w-5">{icon}</span>
        {label}
    </button>
);

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ user, onUpdateUser }) => {
    const [view, setView] = useState<CreatorView>('dashboard');
    const [referredUsers, setReferredUsers] = useState<PublicUserProfile[]>([]);
    const [creatorContent, setCreatorContent] = useState<CreatorContent[]>([]);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { addToast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const unsubReferrals = api.listenForReferredUsers(user.id, setReferredUsers, (err) => console.error(err));
        const unsubContent = api.listenForCreatorContent(user.id, setCreatorContent, (err) => console.error(err));
        const unsubPayouts = api.listenForUserPayouts(user.id, setPayouts, (err) => console.error(err));
        
        Promise.all([
            // Use short timeout to give listeners a moment to populate initial data
            new Promise(resolve => setTimeout(resolve, 1500))
        ]).then(() => setIsLoading(false));

        return () => {
            unsubReferrals();
            unsubContent();
            unsubPayouts();
        };
    }, [user.id]);
    
    const activeMembersCount = useMemo(() => referredUsers.filter(u => u.status === 'active').length, [referredUsers]);
    const totalCommission = user.commissionBalance ?? 0;

    const renderView = () => {
        switch(view) {
            case 'dashboard': return <DashboardView user={user} referredUsers={referredUsers} commission={totalCommission} activeMembers={activeMembersCount} />;
            case 'circle': return <MyCircleView members={referredUsers} />;
            case 'content': return <ContentStudioView user={user} content={creatorContent} />;
            case 'payouts': return <PayoutsView user={user} onUpdateUser={onUpdateUser} payouts={payouts} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
             <div>
                <h1 className="text-3xl font-bold text-white">Welcome, Creator {user.name}!</h1>
                <p className="text-lg text-gray-400">Your hub for growing and mentoring your community within the Commons.</p>
            </div>
             <div className="border-b border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <TabButton label="Dashboard" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                    <TabButton label="My Circle" icon={<UsersIcon/>} isActive={view === 'circle'} onClick={() => setView('circle')} />
                    <TabButton label="Content Studio" icon={<FileTextIcon/>} isActive={view === 'content'} onClick={() => setView('content')} />
                    <TabButton label="Payouts" icon={<DollarSignIcon/>} isActive={view === 'payouts'} onClick={() => setView('payouts')} />
                </nav>
            </div>
            {isLoading ? <div className="flex justify-center p-8"><LoaderIcon className="h-8 w-8 animate-spin" /></div> : renderView()}
        </div>
    );
};


// --- Sub-components for each tab ---

const DashboardView: React.FC<{user: Creator, referredUsers: PublicUserProfile[], commission: number, activeMembers: number}> = ({ user, referredUsers, commission, activeMembers }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { addToast } = useToast();
    const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            addToast("Referral link copied!", "success");
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<UsersIcon className="h-6 w-6 text-green-400" />} title="Total Members" value={referredUsers.length} />
                <StatCard icon={<UserCircleIcon className="h-6 w-6 text-green-400" />} title="Active Members" value={activeMembers} />
                <StatCard icon={<DollarSignIcon className="h-6 w-6 text-green-400" />} title="Commission Balance" value={`$${commission.toFixed(2)}`} />
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-2">Your Growth Engine</h2>
                <p className="text-gray-400 mb-4">Share this link with your audience to invite them to the Global Commons. You'll earn a <strong className="text-white">$1.00 commission</strong> for every member who signs up and gets verified.</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-mono text-lg text-green-300 tracking-widest bg-slate-700 p-2 rounded-md break-all">{referralLink}</p>
                    <button onClick={handleCopy} className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md flex items-center justify-center space-x-2">
                        {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400"/> : <ClipboardIcon className="h-5 w-5"/>}
                        <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                </div>
            </div>
             <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-gray-200 mb-4">Recently Joined</h3>
                {referredUsers.length > 0 ? (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                        {referredUsers.slice(0, 10).map(u => (
                            <li key={u.id} className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-md">
                                <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-white">{u.name}</p>
                                    <p className="text-xs text-gray-400">Joined {u.createdAt ? formatTimeAgo(u.createdAt.toDate().toISOString()) : 'N/A'}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center text-gray-400 py-8">No members have joined via your link yet.</p>}
            </div>
        </div>
    );
};

const MyCircleView: React.FC<{members: PublicUserProfile[]}> = ({ members }) => {
    const [search, setSearch] = useState('');
    const filteredMembers = useMemo(() => members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())), [members, search]);

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <input type="text" placeholder="Search members by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-sm bg-slate-700 p-2 rounded-md text-white mb-4" />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead><tr><th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Name</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Email</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Status</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Joined</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredMembers.map(m => (
                            <tr key={m.id}>
                                <td className="py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">{m.name}</td>
                                <td className="px-3 py-4 text-sm text-gray-400">{m.email}</td>
                                <td className="px-3 py-4 text-sm capitalize">{m.status}</td>
                                <td className="px-3 py-4 text-sm text-gray-400">{m.createdAt ? m.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredMembers.length === 0 && <p className="text-center py-8 text-gray-400">No members found.</p>}
            </div>
        </div>
    );
};

const ContentStudioView: React.FC<{user: Creator, content: CreatorContent[]}> = ({ user, content }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingContent, setDeletingContent] = useState<CreatorContent | null>(null);
    const { addToast } = useToast();
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

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
    }, []);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !editorRef.current?.textContent?.trim()) {
            addToast("Title and content are required.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.createCreatorContent(user, title, body);
            addToast('Content published!', 'success');
            setTitle('');
            setBody('');
            if(editorRef.current) editorRef.current.innerHTML = '';
        } catch {
            addToast('Failed to publish content.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingContent) return;
        try {
            await api.deleteCreatorContent(deletingContent.id);
            addToast('Content deleted.', 'success');
        } catch {
             addToast('Failed to delete content.', 'error');
        } finally {
            setDeletingContent(null);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        setBody(e.currentTarget.innerHTML);
    };

    const handleFormatClick = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setBody(editorRef.current.innerHTML);
        }
    };
    
    const handleLinkClick = () => {
        editorRef.current?.focus();
        const url = window.prompt("Enter the URL:");
        if (url) {
            document.execCommand('createLink', false, url);
            if (editorRef.current) {
                setBody(editorRef.current.innerHTML);
            }
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <ConfirmationDialog isOpen={!!deletingContent} onClose={() => setDeletingContent(null)} onConfirm={handleConfirmDelete} title="Delete Content" message="Are you sure you want to delete this content? This cannot be undone." confirmButtonText="Delete" />
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">New Post for Your Circle</h3>
                <form onSubmit={handlePublish} className="space-y-4">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md text-white" />
                    
                    <div className="border border-slate-700 rounded-md">
                        <div className="flex items-center space-x-1 p-2 bg-slate-900 border-b border-slate-700 flex-wrap">
                            <button type="button" title="Heading 1" onClick={() => handleFormatClick('formatBlock', '<h1>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H1</button>
                            <button type="button" title="Heading 2" onClick={() => handleFormatClick('formatBlock', '<h2>')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded">H2</button>
                            <button type="button" title="Paragraph" onClick={() => handleFormatClick('formatBlock', '<p>')} className="px-2 py-1 text-sm text-gray-300 hover:bg-slate-700 rounded">P</button>
                            <button type="button" title="Bold" onClick={() => handleFormatClick('bold')} className="px-2 py-1 text-sm font-bold text-gray-300 hover:bg-slate-700 rounded w-8">B</button>
                            <button type="button" title="Italic" onClick={() => handleFormatClick('italic')} className="px-2 py-1 text-sm font-bold italic text-gray-300 hover:bg-slate-700 rounded w-8">I</button>
                            <button type="button" title="Add Link" onClick={handleLinkClick} className="px-2 py-1 text-sm text-gray-300 hover:bg-slate-700 rounded underline">Link</button>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable="true"
                            onInput={handleInput}
                            data-placeholder="Write your content here..."
                            className="w-full bg-slate-800 p-3 text-white text-base focus:outline-none wysiwyg-editor"
                            style={{ minHeight: '250px', maxHeight: '50vh', overflowY: 'auto' }}
                        />
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                        {isSubmitting ? 'Publishing...' : 'Publish Content'}
                    </button>
                </form>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Published Content</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {content.length > 0 ? content.map(c => (
                        <div key={c.id} className="bg-slate-700/50 p-3 rounded-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-white">{c.title}</h4>
                                    <p className="text-xs text-gray-400">{formatTimeAgo(c.createdAt.toDate().toISOString())}</p>
                                </div>
                                <button onClick={() => setDeletingContent(c)} className="text-red-500 hover:text-red-400"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                           <div className="text-sm text-gray-300 mt-2 line-clamp-2 wysiwyg-content"><MarkdownRenderer content={c.content} /></div>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">You haven't published any content yet.</p>}
                </div>
            </div>
        </div>
    );
};

const PayoutsView: React.FC<{user: Creator, onUpdateUser: (data: Partial<User>) => void, payouts: PayoutRequest[]}> = ({ user, onUpdateUser, payouts }) => {
    const [payoutData, setPayoutData] = useState({ ecocashName: '', ecocashNumber: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const { addToast } = useToast();

    const handlePayoutRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = user.commissionBalance || 0;
        if (amount <= 0) return;
        setIsProcessing(true);
        try {
            await api.requestCommissionPayout(user, payoutData.ecocashName, payoutData.ecocashNumber, amount);
            addToast('Payout request submitted!', 'success');
            setPayoutData({ ecocashName: '', ecocashNumber: '' });
            // The balance will update via the parent user listener
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Payout request failed", "error");
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                 <h3 className="text-xl font-semibold text-white mb-2">Request Payout</h3>
                <p className="text-gray-400 mb-4">Withdraw your available commission balance.</p>
                 <div className="text-center p-4 bg-slate-900/50 rounded-lg mb-4">
                    <p className="text-sm text-gray-400">Available Balance</p>
                    <p className="text-4xl font-bold text-green-400">${(user.commissionBalance || 0).toFixed(2)}</p>
                </div>
                {(user.commissionBalance || 0) > 0 && (
                    <form onSubmit={handlePayoutRequest} className="space-y-4">
                        <input type="text" value={payoutData.ecocashName} onChange={e => setPayoutData(p => ({...p, ecocashName: e.target.value}))} placeholder="Ecocash Full Name" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        <input type="tel" value={payoutData.ecocashNumber} onChange={e => setPayoutData(p => ({...p, ecocashNumber: e.target.value}))} placeholder="Ecocash Phone Number" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        <button type="submit" disabled={isProcessing} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                            {isProcessing ? 'Processing...' : `Request Payout`}
                        </button>
                    </form>
                )}
            </div>
             <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Payout History</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {payouts.length > 0 ? payouts.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                            <div>
                                <p className="font-semibold text-gray-200">
                                   ${p.amount.toFixed(2)} - {(p.type || 'commission').replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-400">{formatTimeAgo(p.requestedAt.toDate().toISOString())}</p>
                            </div>
                             <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                p.status === 'pending' ? 'bg-yellow-800 text-yellow-300' : 
                                p.status === 'completed' ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'}`
                             }>{p.status}</span>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No payout history.</p>}
                </div>
             </div>
        </div>
    );
};
