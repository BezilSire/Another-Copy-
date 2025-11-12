import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface VerificationHubProps {
    onGetVerifiedClick: () => void;
    onLearnMoreClick: () => void;
}

export const VerificationHub: React.FC<VerificationHubProps> = ({ onGetVerifiedClick, onLearnMoreClick }) => {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center border-2 border-green-500">
                        <ShieldCheckIcon className="h-8 w-8 text-green-400" />
                    </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white">Unlock Your Full Commons Benefits</h2>
                    <p className="text-gray-300 mt-1">Become a verified member by securing your $UBT stake to access exclusive features.</p>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                    <button 
                        onClick={onGetVerifiedClick}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                        Get Verified Now
                        <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </button>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-gray-200 text-center md:text-left">By verifying, you unlock:</h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center md:text-left">
                    <BenefitItem>Sustenance Dividends</BenefitItem>
                    <BenefitItem>Distress Calls</BenefitItem>
                    <BenefitItem>Venture Investing (VEQ)</BenefitItem>
                </div>
                 <div className="text-center mt-4">
                    <button onClick={onLearnMoreClick} className="text-sm text-green-400 hover:text-green-300 font-medium inline-flex items-center">
                        <BookOpenIcon className="h-4 w-4 mr-2" />
                        What is $UBT and why is it required?
                    </button>
                </div>
            </div>
        </div>
    );
};

const BenefitItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center justify-center md:justify-start space-x-2">
        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
        <span className="text-gray-300">{children}</span>
    </div>
);
