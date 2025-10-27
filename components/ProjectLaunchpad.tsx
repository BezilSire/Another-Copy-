import React, { useState } from 'react';
import { generateProjectIdea } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { SparkleIcon } from './icons/SparkleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { UsersIcon } from './icons/UsersIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';

interface ProjectData {
  projectName: string;
  justification: {
    opportunity: string;
    dataBackedReasoning: string;
  };
  requirements: {
    equipment: string[];
    materials: string[];
    skills: string[];
  };
  budgetBreakdown: { item: string; cost: number; notes: string }[];
  totalEstimatedCost: number;
  executionPlan: { step: number; action: string; details: string }[];
  timeline: {
    setup: string;
    launch: string;
  };
  financials: {
    pricingStrategy: string;
    breakEvenAnalysis: string;
  };
  commonsFeedbackLoop: string;
  externalResources: { title: string; url: string }[];
}

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-3 mb-3">
            <div className="bg-slate-700 p-2 rounded-full">{icon}</div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="text-gray-300 text-sm space-y-2">{children}</div>
    </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors" title="Copy content">
            {copied ? <ClipboardCheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardIcon className="h-4 w-4" />}
        </button>
    );
};

export const ProjectLaunchpad: React.FC = () => {
    const [project, setProject] = useState<ProjectData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        setProject(null);
        try {
            const result = await generateProjectIdea();
            setProject(result);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to generate project.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!project && !isLoading && (
                 <div className="text-center p-8 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600">
                    <SparkleIcon className="h-12 w-12 mx-auto text-green-400" />
                    <h2 className="text-xl font-bold text-white mt-4">Project Launchpad</h2>
                    <p className="text-gray-300 mt-1 max-w-xl mx-auto">Let our AI assistant generate a detailed, viable business plan for a small-scale project tailored for the Zimbabwean market.</p>
                    <button onClick={handleGenerate} className="mt-6 inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-lg">
                        <SparkleIcon className="h-5 w-5 mr-2"/>
                        Suggest a Project Idea
                    </button>
                </div>
            )}

            {isLoading && (
                 <div className="text-center p-8 bg-slate-800 rounded-lg">
                    <LoaderIcon className="h-12 w-12 mx-auto text-green-400 animate-spin" />
                    <h2 className="text-xl font-semibold text-white mt-4">Analyzing Opportunities...</h2>
                    <p className="text-gray-300 mt-1">Our AI is scanning market data and formulating a plan. This may take a moment.</p>
                </div>
            )}

            {project && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">{project.projectName}</h1>
                         <button onClick={handleGenerate} disabled={isLoading} className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 font-semibold text-sm disabled:bg-slate-600">
                            {isLoading ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <SparkleIcon className="h-5 w-5 mr-2"/>}
                            <span>{isLoading ? '' : 'Suggest Another'}</span>
                        </button>
                    </div>

                    <InfoCard title="Justification & Opportunity" icon={<LightbulbIcon className="h-5 w-5 text-green-400"/>}>
                        <p className="font-semibold text-gray-200">The Opportunity:</p>
                        <p>{project.justification.opportunity}</p>
                        <p className="font-semibold text-gray-200 pt-2">Data-Backed Reasoning:</p>
                        <p className="italic">"{project.justification.dataBackedReasoning}"</p>
                    </InfoCard>

                     <InfoCard title="Budget & Requirements" icon={<DollarSignIcon className="h-5 w-5 text-green-400"/>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-gray-200 mb-2">Requirements</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><strong>Equipment:</strong> {project.requirements.equipment.join(', ')}</li>
                                    <li><strong>Materials:</strong> {project.requirements.materials.join(', ')}</li>
                                    <li><strong>Skills:</strong> {project.requirements.skills.join(', ')}</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-200 mb-2">Budget Breakdown (Est. Total: ${project.totalEstimatedCost.toFixed(2)})</h4>
                                <ul className="space-y-1">
                                    {project.budgetBreakdown.map(item => (
                                        <li key={item.item} className="flex justify-between">
                                            <span>{item.item} <em className="text-gray-400">({item.notes})</em></span>
                                            <span className="font-mono">${item.cost.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Execution Plan & Timeline" icon={<BriefcaseIcon className="h-5 w-5 text-green-400"/>}>
                        <p><strong className="text-gray-200">Setup Time:</strong> {project.timeline.setup} | <strong className="text-gray-200">Launch Time:</strong> {project.timeline.launch}</p>
                        <ol className="list-decimal list-inside space-y-2 mt-2">
                           {project.executionPlan.map(step => (
                               <li key={step.step}><strong>{step.action}:</strong> {step.details}</li>
                           ))}
                        </ol>
                    </InfoCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard title="Financials" icon={<TrendingUpIcon className="h-5 w-5 text-green-400"/>}>
                             <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-gray-200">Pricing Strategy</h4>
                                <CopyButton text={project.financials.pricingStrategy}/>
                            </div>
                            <p>{project.financials.pricingStrategy}</p>
                            <div className="flex justify-between items-start pt-2">
                                <h4 className="font-semibold text-gray-200">Break-Even Analysis</h4>
                                <CopyButton text={project.financials.breakEvenAnalysis}/>
                            </div>
                            <p>{project.financials.breakEvenAnalysis}</p>
                        </InfoCard>
                         <InfoCard title="Commons Feedback Loop" icon={<UsersIcon className="h-5 w-5 text-green-400"/>}>
                             <p>{project.commonsFeedbackLoop}</p>
                        </InfoCard>
                    </div>

                    {project.externalResources.length > 0 && (
                        <InfoCard title="External Resources" icon={<GlobeIcon className="h-5 w-5 text-green-400"/>}>
                            <ul className="list-disc list-inside">
                                {project.externalResources.map(res => <li key={res.url}><a href={res.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{res.title}</a></li>)}
                            </ul>
                        </InfoCard>
                    )}
                </div>
            )}
        </div>
    );
};
