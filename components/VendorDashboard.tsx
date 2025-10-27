import React, { useState } from 'react';
import { VendorUser } from '../types';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { VendorScannerPage } from './VendorScannerPage';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';

interface VendorDashboardProps {
  user: VendorUser;
  onUpdateUser: (updatedData: Partial<VendorUser>) => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ user, onUpdateUser }) => {
    const [isScanning, setIsScanning] = useState(false);
    const { addToast } = useToast();

    const handleRedeem = async (voucherId: string) => {
        try {
            const redeemedValue = await api.redeemVoucher(user, voucherId);
            addToast(`Voucher for $${redeemedValue.toFixed(2)} redeemed successfully!`, 'success');
            onUpdateUser({ balance: (user.balance || 0) + redeemedValue });
            setIsScanning(false);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to redeem voucher.', 'error');
            // Do not close scanner on error, let them try again
        }
    };

    if (isScanning) {
        return <VendorScannerPage onScan={handleRedeem} onBack={() => setIsScanning(false)} />;
    }

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Vendor Dashboard</h1>
                <p className="text-lg text-gray-400">{user.businessName || user.name}</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
                <p className="text-sm font-medium text-gray-400">Current Balance</p>
                <p className="text-5xl font-bold text-green-400 mt-2">${(user.balance || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">From redeemed Sustenance Vouchers</p>
            </div>

            <div className="text-center">
                 <button 
                    onClick={() => setIsScanning(true)}
                    className="w-full max-w-sm inline-flex items-center justify-center px-8 py-6 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 font-semibold text-xl"
                >
                    <QrCodeIcon className="h-8 w-8 mr-4" />
                    Scan Member Voucher
                </button>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
                <div className="text-center py-8 text-gray-500">
                    <p>Transaction history will appear here.</p>
                </div>
            </div>
        </div>
    );
};
