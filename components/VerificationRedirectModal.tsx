import React from 'react';
import { GlobeIcon } from './icons/GlobeIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface VerificationRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyUrl: string;
}

export const VerificationRedirectModal: React.FC<VerificationRedirectModalProps> = ({ isOpen, onClose, buyUrl }) => {
  if (!isOpen) {
    return null;
  }

  const handleProceed = () => {
    window.open(buyUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-900 bg-opacity-50 sm:mx-0 sm:h-10 sm:w-10">
                <GlobeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                  Redirecting to Purchase Page
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-300">
                    You will be redirected to our secure partner website to purchase your $UBT.
                  </p>
                   <p className="text-sm text-gray-400 mt-3">
                    After your purchase, it may take a short while for our system to verify the transaction and update your account status. You can return to the app at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleProceed}
            >
              Proceed to Purchase
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-gray-300 hover:bg-slate-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
