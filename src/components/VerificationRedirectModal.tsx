import React from 'react';
import { GlobeIcon } from './icons/GlobeIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { LogoIcon } from './icons/LogoIcon';

interface VerificationRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationRedirectModal: React.FC<VerificationRedirectModalProps> = ({ isOpen, onClose }) => {
  const WHATSAPP_LINK = "https://wa.me/447446959717?text=I%20already%20own%20%24UBT%20and%20need%20verification";
  const FOUNDER_ID_LINK = "https://ubuntium.org/founder-id";

  if (!isOpen) {
    return null;
  }
  
  const handleAction = (url: string) => {
    window.open(url, '_blank');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                     <h3 className="text-xl leading-6 font-bold text-white" id="modal-title">
                      Confirm Your Stake
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                <p className="text-gray-300">
                  To get full access to the commons, please confirm you hold at least <strong>$10 in $UBT</strong>. This asset powers our ecosystem and represents your share in our collective future.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleAction(WHATSAPP_LINK)}
                    className="w-full text-left p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <p className="font-semibold">Yes, I own $UBT</p>
                    <p className="text-sm text-green-100">Proceed to verify with an admin on WhatsApp.</p>
                  </button>
                  <button
                    onClick={() => handleAction(FOUNDER_ID_LINK)}
                    className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <p className="font-semibold">No, I need to get $UBT</p>
                    <p className="text-sm text-slate-300">You'll be directed to our website to securely purchase your stake.</p>
                  </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
