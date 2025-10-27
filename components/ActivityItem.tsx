import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { formatTimeAgo } from '../utils';
import { api } from '../services/apiService';
import { UsersIcon } from './icons/UsersIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface ActivityItemProps {
  activity: Activity;
  onViewProfile: (userId: string) => void;
}

const ActivityIcon: React.FC<{ type: Activity['type'] }> = ({ type }) => {
    // This is used for the generic activity items.
    const className = "h-8 w-8 text-green-400";
    switch (type) {
        case 'NEW_MEMBER': return <UsersIcon className={className} />; // Fallback icon
        case 'NEW_POST_PROPOSAL': return <LightbulbIcon className={className} />;
        case 'NEW_POST_OPPORTUNITY': return <BriefcaseIcon className={className} />;
        case 'NEW_POST_OFFER': return <UsersIcon className={className} />;
        case 'NEW_POST_GENERAL': return <MessageSquareIcon className={className} />;
        default: return <UserCircleIcon className={className} />;
    }
};


export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onViewProfile }) => {
    // NOTE: Removed useEffect that fetched member bio to prevent permission errors.
    // The error "Missing or insufficient permissions" occurs because members cannot 'get'
    // the full profile document of another member directly. This change fixes the error
    // by removing the feature that displays the bio on this card.

    if (activity.type === 'NEW_MEMBER') {
        return (
            <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-green-900/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <UsersIcon className="h-5 w-5 text-green-400" />
                        <h3 className="text-sm font-bold text-green-400">New Member in the Commons</h3>
                    </div>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp.toDate().toISOString())}</p>
                </div>

                <button
                    onClick={() => onViewProfile(activity.causerId)}
                    className="w-full text-left bg-slate-900/50 p-4 rounded-lg transition-colors hover:bg-slate-700/50 block"
                >
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <UserCircleIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-white truncate">{activity.causerName}</p>
                            <p className="text-sm text-gray-400 truncate">{activity.causerCircle}</p>
                        </div>
                    </div>
                </button>
            </div>
        );
    }

    // Fallback for other activity types
    return (
        <div className="bg-slate-800/50 p-4 rounded-lg flex items-center space-x-4 border border-slate-700/50">
            <div className="flex-shrink-0 bg-slate-700 rounded-full p-3">
                <ActivityIcon type={activity.type} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                    {activity.message.includes(activity.causerName) ? (
                        <>
                            <button onClick={() => onViewProfile(activity.causerId)} className="font-semibold text-white hover:underline">{activity.causerName}</button>
                            {activity.message.replace(activity.causerName, '')}
                        </>
                    ) : activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp.toDate().toISOString())} &bull; Community Activity</p>
            </div>
        </div>
    );
};