import React, { useState } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';

interface VendorScannerPageProps {
  onScan: (voucherId: string) => Promise<void>;
  onBack: () => void;
}

export const VendorScannerPage: React.FC<VendorScannerPageProps> = ({ onScan, onBack }) => {
    const [voucherId, setVoucherId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voucherId.trim() || isProcessing) return;

        setIsProcessing(true);
        try {
            await onScan(voucherId.trim().toUpperCase());
        } finally {
            // The parent component will handle navigation on success.
            // On failure, we want to stay here, so only reset processing state.
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
             <button onClick={onBack} className="inline-flex items-center mb-6 text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
            </button>

            <div className="bg-slate-800 p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Redeem Sustenance Voucher</h1>
                <p className="text-gray-400 mb-6">Scan the member's QR code or enter the voucher ID below.</p>

                {/* Placeholder for camera view */}
                <div className="w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-slate-600">
                    <div className="text-center text-gray-500">
                        <QrCodeIcon className="h-16 w-16 mx-auto" />
                        <p className="mt-2 font-semibold">Camera view for QR scanning</p>
                        <p className="text-xs">(Feature coming soon)</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="voucherId" className="block text-sm font-medium text-gray-300 text-left mb-1">Voucher ID</label>
                    <input
                        id="voucherId"
                        type="text"
                        value={voucherId}
                        onChange={(e) => setVoucherId(e.target.value)}
                        className="block w-full text-center font-mono text-lg px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="UGCV-XXXXXX"
                        required
                        disabled={isProcessing}
                        autoCapitalize="characters"
                    />
                    <button
                        type="submit"
                        disabled={isProcessing || !voucherId.trim()}
                        className="w-full mt-4 inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-lg disabled:bg-slate-600"
                    >
                        {isProcessing ? (
                            <>
                                <LoaderIcon className="h-6 w-6 mr-3 animate-spin" />
                                Verifying...
                            </>
                        ) : 'Redeem Voucher'}
                    </button>
                </form>
            </div>
        </div>
    );
};
