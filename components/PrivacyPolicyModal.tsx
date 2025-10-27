import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                Privacy Policy
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4 prose prose-invert prose-sm max-w-none text-gray-300 h-[60vh] overflow-y-auto pr-4">
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
                
                <h4 className="font-semibold text-gray-200 mt-4">1. Introduction</h4>
                <p>Welcome to the Ubuntium Global Commons Agent Portal ("the App"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.</p>

                <h4 className="font-semibold text-gray-200 mt-4">2. Information We Collect</h4>
                <p>We may collect information about you in a variety of ways. The information we may collect on the App includes:</p>
                <ul>
                    <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, phone number, circle, and address that you voluntarily give to us when you register with the App.</li>
                    <li><strong>User-Generated Content:</strong> Posts, messages, and other content you create on the platform are stored on our servers to provide the service.</li>
                </ul>

                <h4 className="font-semibold text-gray-200 mt-4">3. How We Use Your Information</h4>
                <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:</p>
                <ul>
                    <li>Create and manage your account.</li>
                    <li>Enable user-to-user communications.</li>
                    <li>Monitor and analyze usage and trends to improve your experience with the App.</li>
                    <li>Provide and deliver the services you request.</li>
                    <li>Send administrative information, such as security alerts and support messages.</li>
                </ul>

                <h4 className="font-semibold text-gray-200 mt-4">4. Disclosure of Your Information</h4>
                <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. Your information is used solely for the purpose of operating the Ubuntium Global Commons platform and its associated services.</p>
                
                <h4 className="font-semibold text-gray-200 mt-4">5. Security of Your Information</h4>
                <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
                
                <h4 className="font-semibold text-gray-200 mt-4">6. Your Rights</h4>
                <p>You may at any time review or change the information in your account by accessing your profile settings. If you wish to terminate your account, please contact support.</p>

                <h4 className="font-semibold text-gray-200 mt-4">7. Contact Us</h4>
                <p>If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:support@globalcommons.app" className="text-green-400 hover:underline">support@globalcommons.app</a></p>
            </div>
          </div>
           <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-gray-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
