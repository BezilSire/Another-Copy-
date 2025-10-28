import React, { useState, useEffect } from 'react';
import { User, Post, Bounty } from '../types';
import { generatePersonalizedBriefing } from '../services/geminiService';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DailyBriefingCardProps {
  user: User;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({ user }) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateBriefing = async () => {
      setIsLoading(true);
      try {
        const [posts, bounties] = await Promise.all([
          api.getRecentPosts(5),
          api.getOpenBounties(),
        ]);
        const briefingText = await generatePersonalizedBriefing(user, posts, bounties);
        setBriefing(briefingText);
      } catch (error) {
        console.error("Failed to generate briefing:", error);
        setBriefing("Could not generate your daily briefing at this time.");
      } finally {
        setIsLoading(false);
      }
    };

    generateBriefing();
  }, [user]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
        <SparkleIcon className="h-5 w-5 mr-2 text-green-400"/>
        Your Daily Briefing
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoaderIcon className="h-6 w-6 animate-spin text-green-500" />
          <p className="ml-3 text-gray-400">Generating your personalized briefing...</p>
        </div>
      ) : briefing ? (
        <div className="prose prose-sm prose-invert max-w-none text-gray-300">
          <MarkdownRenderer content={briefing} />
        </div>
      ) : (
        <p className="text-gray-400">Could not load your briefing.</p>
      )}
    </div>
  );
};