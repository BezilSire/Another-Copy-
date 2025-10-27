import React, { useState, useEffect, useMemo } from 'react';
import { MemberUser, User, Venture } from '../types';
import { elaborateBusinessIdea, analyzeTargetMarket, generatePitchDeck } from '../services/geminiService';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { UserCard } from './UserCard';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

const LOOKING_FOR_LIST = ['Co-founder', 'Business Partner', 'Investor', 'Mentor', 'Advisor', 'Employee', 'Freelancer'];

interface AIVenturePitchAssistantProps {
  user: MemberUser;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onBack: () => void;
}

export const AIVenturePitchAssistant: React.FC<AIVenturePitchAssistantProps> = ({ user, onUpdateUser, onBack }) => {
    // Shared State
    const [businessIdea, setBusinessIdea] = useState(user.businessIdea || '');
    const [lookingFor, setLookingFor] = useState<string[]>(user.lookingFor || []);
    
    // Step-specific generated data
    const [step1Result, setStep1Result] = useState<{ suggestedNames: string[], detailedPlan: string, impactAnalysis: { score: number, reasoning: string } } | null>(null);
    const [targetMarket, setTargetMarket] = useState('');
    const [step2Result, setStep2Result] = useState<{ personas: any[], requiredSkills: string[] } | null>(null);
    const [pitchDeck, setPitchDeck] = useState<{ title: string; slides: { title: string; content: string }[] } | null>(
        user.pitchDeckTitle && user.pitchDeckSlides ? { title: user.pitchDeckTitle, slides: user.pitchDeckSlides } : null
    );
    const [fundingGoalUsd, setFundingGoalUsd] = useState(0);


    // Collaborator state
    const [allVentureMembers, setAllVentureMembers] = useState<(User & { id: string })[]>([]);
    const [suggestedCollaborators, setSuggestedCollaborators] = useState<(User & { id: string })[]>([]);

    // UI State
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedSlide, setCopiedSlide] = useState<number | null>(null);
    const { addToast } = useToast();
    
    useEffect(() => {
        api.getVentureMembers(500).then(({ users }) => {
          setAllVentureMembers(users.filter(u => u.id !== user.id));
        });
    }, [user.id]);

    const handleStep1Submit = async () => {
        if (!businessIdea.trim() || lookingFor.length === 0) {
            addToast('Please describe your idea and select what you are looking for.', 'error');
            return;
        }
        setIsLoading(true);
        setStep1Result(null);
        try {
            const result = await elaborateBusinessIdea(businessIdea);
            setStep1Result(result);
            setStep(2);
        } catch (error) {
            addToast(error instanceof Error ? error.message : "AI analysis failed.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStep2Submit = async () => {
        if (!targetMarket.trim() || !step1Result) return;
        setIsLoading(true);
        setStep2Result(null);
        try {
            const result = await analyzeTargetMarket(step1Result.detailedPlan, targetMarket);
            setStep2Result(result);
            // Filter collaborators
            const collaborators = allVentureMembers.filter(member => 
                result.requiredSkills.some(skill => 
                    member.skills?.toLowerCase().includes(skill.toLowerCase())
                )
            );
            setSuggestedCollaborators(collaborators as (User & {id: string})[]);
            setStep(3);
        } catch (error) {
             addToast(error instanceof Error ? error.message : "AI market analysis failed.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStep3Submit = async () => {
        if (!step1Result) return;
        setIsLoading(true);
        setPitchDeck(null);
        try {
            const finalDeck = await generatePitchDeck(step1Result.detailedPlan, lookingFor);
            setPitchDeck(finalDeck);
            setStep(4);
        } catch (error) {
             addToast(error instanceof Error ? error.message : "AI pitch generation failed.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleListOnMarketplace = async () => {
        if (!pitchDeck || !step1Result || fundingGoalUsd <= 0) {
            addToast('Please set a valid funding goal.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const cvp = await api.getCommunityValuePool();
            const ccapGoal = Math.ceil(fundingGoalUsd / cvp.ccap_to_usd_rate);

            const ventureData: Omit<Venture, 'id' | 'createdAt' | 'fundingRaisedCcap' | 'backers' | 'status' | 'totalSharesIssued' | 'totalProfitsDistributed' | 'ticker'> & { name: string } = {
                name: pitchDeck.title,
                description: step1Result.detailedPlan,
                ownerId: user.id,
                ownerName: user.name,
                fundingGoalUsd,
                fundingGoalCcap: ccapGoal,
                pitchDeck,
                impactAnalysis: step1Result.impactAnalysis,
            };

            await api.createVenture(ventureData);
            addToast('Success! Your venture is now live on the marketplace.', 'success');
            onBack();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to list venture.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedSlide(index);
            setTimeout(() => setCopiedSlide(null), 2000);
        });
    };

    const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
        const steps = ["Idea", "Analysis", "Team", "Pitch", "Publish"];
        return (
            <div className="flex items-center justify-between px-2 mb-6">
                {steps.map((label, index) => {
                    const stepNum = index + 1;
                    const isCompleted = stepNum < currentStep;
                    const isActive = stepNum === currentStep;
                    return (
                        <React.Fragment key={stepNum}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCompleted ? 'bg-green-600 text-white' : isActive ? 'bg-green-400 text-slate-900 ring-2 ring-green-400' : 'bg-slate-700 text-gray-300'}`}>
                                    {isCompleted ? '✓' : stepNum}
                                </div>
                                <p className={`mt-1 text-xs ${isActive ? 'text-white font-semibold' : 'text-gray-400'}`}>{label}</p>
                            </div>
                            {stepNum < steps.length && <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-slate-700'}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="inline-flex items-center text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
            </button>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <StepIndicator currentStep={step} />

                {step === 1 && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-semibold text-white">Step 1: Your Core Idea</h2>
                        <div>
                            <label htmlFor="businessIdea" className="block text-sm font-medium text-gray-300">Your Business Idea</label>
                            <textarea id="businessIdea" rows={4} value={businessIdea} onChange={e => setBusinessIdea(e.target.value)} placeholder="Describe your vision, what problem you are solving, and for whom." className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">What are you looking for?</label>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {LOOKING_FOR_LIST.map(item => (
                                    <label key={item} className="flex items-center space-x-2 text-sm text-gray-300"><input type="checkbox" value={item} checked={lookingFor.includes(item)} onChange={e => setLookingFor(p => e.target.checked ? [...p, e.target.value] : p.filter(i => i !== e.target.value))} className="text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"/><span>{item}</span></label>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2 text-right">
                            <button onClick={handleStep1Submit} disabled={isLoading} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                {isLoading ? <><LoaderIcon className="h-5 w-5 mr-2 animate-spin"/>Analyzing...</> : <>Next: Brainstorm & Analyze <SparkleIcon className="h-5 w-5 ml-2"/></>}
                            </button>
                        </div>
                    </div>
                )}
                
                {step === 2 && step1Result && (
                    <div className="animate-fade-in space-y-6">
                        <h2 className="text-xl font-semibold text-white">Step 2: AI Analysis & Market Definition</h2>
                        <div className="space-y-4">
                            <div><h3 className="font-semibold text-green-400">Suggested Names</h3><div className="flex flex-wrap gap-2 mt-1">{step1Result.suggestedNames.map(name => <span key={name} className="bg-slate-700 text-white px-3 py-1 rounded-full text-sm">{name}</span>)}</div></div>
                            <div><h3 className="font-semibold text-green-400">Elaborated Plan</h3><p className="text-gray-300 whitespace-pre-line mt-1">{step1Result.detailedPlan}</p></div>
                            <div><h3 className="font-semibold text-green-400">Impact Analysis</h3><div className="flex items-center gap-4 mt-1"><div className="text-4xl font-bold text-white bg-slate-700 rounded-lg p-3">{step1Result.impactAnalysis.score}/10</div><p className="text-gray-300 italic">{step1Result.impactAnalysis.reasoning}</p></div></div>
                        </div>
                        <div className="pt-4 border-t border-slate-700">
                            <label htmlFor="targetMarket" className="block text-sm font-medium text-gray-300">Describe your target market</label>
                            <textarea id="targetMarket" rows={3} value={targetMarket} onChange={e => setTargetMarket(e.target.value)} placeholder="e.g., Small-scale farmers in rural Uganda, university students in Harare..." className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"></textarea>
                        </div>
                         <div className="pt-2 text-right">
                            <button onClick={handleStep2Submit} disabled={isLoading || !targetMarket.trim()} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                {isLoading ? <><LoaderIcon className="h-5 w-5 mr-2 animate-spin"/>Analyzing...</> : <>Next: Find Team <SparkleIcon className="h-5 w-5 ml-2"/></>}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && step2Result && (
                     <div className="animate-fade-in space-y-6">
                        <h2 className="text-xl font-semibold text-white">Step 3: Market Personas & Team Building</h2>
                        <div><h3 className="font-semibold text-green-400 mb-2">Potential Client Personas</h3>
                            <div className="grid md:grid-cols-2 gap-4">{step2Result.personas.map((p, i) => <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-2"><h4 className="font-bold text-white">{p.name}</h4><div><p className="text-xs text-gray-400">Demographics</p><p className="text-sm">{p.demographics}</p></div><div><p className="text-xs text-gray-400">Needs & Goals</p><p className="text-sm">{p.needs}</p></div><div><p className="text-xs text-gray-400">Pain Points</p><p className="text-sm">{p.painPoints}</p></div></div>)}</div>
                        </div>
                        <div><h3 className="font-semibold text-green-400 mb-2">Suggested Collaborators from the Commons</h3>
                            {suggestedCollaborators.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{suggestedCollaborators.map(m => <UserCard key={m.id} user={m} currentUser={user} onClick={() => {}} />)}</div> : <p className="text-center text-gray-400 p-4 bg-slate-900/50 rounded-lg">No members found matching the required skills: {step2Result.requiredSkills.join(', ')}.</p>}
                        </div>
                        <div className="pt-2 text-right">
                            <button onClick={handleStep3Submit} disabled={isLoading} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                {isLoading ? <><LoaderIcon className="h-5 w-5 mr-2 animate-spin"/>Generating...</> : <>Next: Generate Final Pitch <SparkleIcon className="h-5 w-5 ml-2"/></>}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && pitchDeck && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">{pitchDeck.title}</h2>
                        </div>
                        <div className="mt-4 space-y-4">
                            {pitchDeck.slides.map((slide, index) => (
                                <div key={index} className="pt-4 border-t border-slate-700">
                                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-green-400">{slide.title}</h3><button onClick={() => handleCopy(slide.content, index)} className="text-slate-400 hover:text-white transition-colors" title="Copy content">{copiedSlide === index ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}</button></div>
                                    <p className="text-gray-300 whitespace-pre-line mt-1">{slide.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 mt-4 text-right">
                           <button onClick={() => setStep(5)} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                                Next: Publish
                            </button>
                        </div>
                    </div>
                )}

                {step === 5 && pitchDeck && step1Result && (
                    <div className="animate-fade-in space-y-6">
                         <h2 className="text-xl font-semibold text-white">Step 5: Publish to Marketplace</h2>
                         <p className="text-gray-300">Your venture is ready to be listed! Set a funding goal to start attracting investors from the community.</p>
                         <div>
                            <label htmlFor="fundingGoalUsd" className="block text-sm font-medium text-gray-300">Funding Goal (in USD)</label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-400 sm:text-sm">$</span>
                                </div>
                                <input type="number" id="fundingGoalUsd" value={fundingGoalUsd} onChange={e => setFundingGoalUsd(Number(e.target.value))} className="block w-full rounded-md border-slate-600 bg-slate-700 pl-7 pr-12 py-2 text-white" placeholder="0.00" />
                            </div>
                         </div>
                         <div className="pt-4 text-right">
                            <button onClick={handleListOnMarketplace} disabled={isSaving || fundingGoalUsd <= 0} className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                {isSaving ? <><LoaderIcon className="h-5 w-5 mr-2 animate-spin"/>Publishing...</> : 'List on Marketplace'}
                            </button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};