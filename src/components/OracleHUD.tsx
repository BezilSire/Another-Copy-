
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { SparkleIcon } from './icons/SparkleIcon';
import { getChatBotResponse } from '../services/geminiService';
import { LoaderIcon } from './icons/LoaderIcon';

export const OracleHUD: React.FC<{ user: User }> = ({ user }) => {
    const [guideText, setGuideText] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGuide = async () => {
            setIsLoading(true);
            try {
                const prompt = `Act as a helpful community neighbor in the Ubuntium app. The user is ${user.name} in ${user.circle}. 
                Briefly welcome them back, mention one good thing about their circle, and suggest they check the "Earn" tab for points. 
                Keep it friendly, simple, and under 30 words. No technical jargon.`;
                const response = await getChatBotResponse(prompt);
                setGuideText(response);
            } catch (error) {
                setGuideText("Welcome back! Your community is active today. Check out new tasks to earn rewards.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchGuide();
    }, [user.name, user.circle]);

    return (
        <div className="fintech-card p-6 relative overflow-hidden animate-fade-in group">
            <div className="absolute top-0 right-0 p-6 opacity-10">
                <SparkleIcon className="h-16 w-16 text-brand-gold" />
            </div>

            <div className="relative z-10 flex items-start gap-4">
                <div className="p-3 bg-brand-gold/10 rounded-full text-brand-gold">
                    <SparkleIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">Your Community Guide</h3>
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-2">
                            <LoaderIcon className="h-3 w-3 animate-spin text-brand-gold" />
                            <p className="text-xs text-slate-400">Thinking...</p>
                        </div>
                    ) : (
                        <div className="text-slate-300 text-sm leading-relaxed font-medium">
                            {guideText}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
