
import React, { useState, useEffect } from 'react';
import { MemberUser, SustenanceVoucher, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { HeartIcon } from './icons/HeartIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { formatTimeAgo } from '../utils';

interface SustenancePageProps {
  user: MemberUser;
}

const CountdownTimer: React.FC<{ nextDrop: Date }> = ({ nextDrop }) => {
    const calculateTimeLeft = () => {
        const difference = +nextDrop - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    return (
        <div className="flex space-x-4 text-center">
            {Object.entries(timeLeft).map(([interval, value]) => (
                <div key={interval}>
                    <div className="text-4xl font-bold text-white">{String(value).padStart(2, '0')}</div>
                    <div className="text-xs uppercase text-gray-400">{interval}</div>
                </div>
            ))}
        </div>
    );
};

const VoucherCard: React.FC<{ voucher: SustenanceVoucher }> = ({ voucher }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border-l-4 border-green-500">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-white">Food Hamper Voucher</h3>
                    <p className="text-lg font-semibold text-green-400">${voucher.value.toFixed(2)} USDT</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-800 text-green-300">Active</span>
            </div>
            <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-white p-2 rounded-lg">
                    {/* Placeholder for QR Code */}
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${voucher.id}`} alt="Voucher QR Code" />
                </div>
                <div className="flex-1 text-center md:text-left">
                     <p className="font-mono text-lg text-gray-300 tracking-widest bg-slate-700/50 p-2 rounded-md inline-block">{voucher.id}</p>
                     <p className="text-sm text-gray-400 mt-2">Present this code to a verified vendor to redeem your hamper. Do not share this code.</p>
                     <p className="text-xs text-yellow-400 mt-2">Expires in {formatTimeAgo(voucher.expiresAt.toDate().toISOString())}</p>
                </div>
            </div>
        </div>
    );
};

export const SustenancePage: React.FC<SustenancePageProps> = ({ user }) => {
    const [sustenanceVault, setSustenanceVault] = useState<TreasuryVault | null>(null);
    const activeVouchers = user.sustenanceVouchers?.filter(v => v.status === 'active') || [];
    const pastVouchers = user.sustenanceVouchers?.filter(v => v.status !== 'active') || [];

    useEffect(() => {
        api.listenToVaults(vts => {
            const vault = vts.find(v => v.type === 'SUSTENANCE');
            if (vault) setSustenanceVault(vault);
        }, console.error);
    }, []);

    const calculateNextDrop = () => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        const nextCycleStartMonth = Math.floor(currentMonth / 2) * 2 + 2;
        return new Date(Date.UTC(year, nextCycleStartMonth, 1));
    };

    const nextDropDate = calculateNextDrop();
    const sustenanceTickets = user.ccap || 0;

    return (
        <div className="space-y-8 animate-fade-in pb-10">
             <div className="text-center p-8 bg-slate-800 rounded-lg">
                <HeartIcon className="h-16 w-16 mx-auto text-green-400 mb-4" />
                <h1 className="text-3xl font-bold text-white">Sustenance Dividend</h1>
                <p className="text-lg text-green-400 mt-1">Your Rightful Share of the Commons' Success</p>
            </div>

            {/* Proof of Reserve Section */}
            <div className="bg-slate-950/60 p-6 rounded-lg border border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 text-brand-gold">
                        <LockIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Sustenance Vault Balance</h3>
                        <p className="text-xs text-gray-500 font-mono">Anchor: {sustenanceVault?.publicKey || 'Searching...'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black text-brand-gold font-mono tracking-tighter">
                        {sustenanceVault?.balance.toLocaleString() || '0'} <span className="text-lg">UBT</span>
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Publicly Auditable Reserve</p>
                </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 flex items-start gap-4">
                <HeartIcon className="h-10 w-10 text-green-400 flex-shrink-0 mt-1" />
                <div>
                    <h2 className="text-lg font-semibold text-white">How Sustenance Tickets Work</h2>
                    <p className="text-sm text-gray-300 mt-1">
                        Your Sustenance Tickets determine your chance of receiving a food hamper in our bi-monthly dividend drop. You earn tickets directly from your Civic Capital (CCAP).
                        <br />
                        <strong className="text-gray-200">The formula is: <code className="bg-slate-700 p-1 rounded text-xs">Tickets = CCAP</code>.</strong>
                        <br />
                        The more you contribute, the higher your chances!
                    </p>
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-lg text-center">
                    <h2 className="text-xl font-semibold text-white">Your Sustenance Tickets</h2>
                    <p className="text-6xl font-bold text-yellow-400 my-2">{sustenanceTickets.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">The more you contribute (CCAP), the higher your chance of receiving the next dividend.</p>
                </div>
                 <div className="bg-slate-800 p-6 rounded-lg text-center">
                     <h2 className="text-xl font-semibold text-white">Next Dividend Drop In</h2>
                    <div className="flex justify-center my-3">
                         <CountdownTimer nextDrop={nextDropDate} />
                    </div>
                    <p className="text-sm text-gray-400">Winners are selected algorithmically every 2 months. Good luck!</p>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Your Vouchers</h2>
                {activeVouchers.length > 0 ? (
                    <div className="space-y-4">
                        {activeVouchers.map(v => <VoucherCard key={v.id} voucher={v} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-800 rounded-lg">
                        <p className="text-gray-400">You have no active food vouchers.</p>
                        <p className="text-sm text-gray-500 mt-1">Keep contributing to increase your chances for the next drop!</p>
                    </div>
                )}
            </div>
            
            {pastVouchers.length > 0 && (
                <div>
                     <h2 className="text-2xl font-bold text-white mb-4">Past Vouchers</h2>
                     <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                        {pastVouchers.map(v => (
                             <div key={v.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md text-sm">
                                <div>
                                    <p className="font-semibold text-gray-300">Hamper Voucher (${v.value.toFixed(2)})</p>
                                    <p className="text-xs text-gray-500">Issued on {v.issuedAt.toDate().toLocaleDateString()}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.status === 'redeemed' ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                                    {v.status}
                                </span>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
};
