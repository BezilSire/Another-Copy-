
import React from 'react';
import { MemberUser } from '../types';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

interface RightSidebarProps {
  user: MemberUser;
}

const TrendItem: React.FC<{ tag: string; posts: string }> = ({ tag, posts }) => (
    <div className="py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition-colors">
        <p className="text-xs text-gray-500 font-medium">Trending in Commons</p>
        <p className="font-bold text-white mt-0.5">{tag}</p>
        <p className="text-xs text-gray-500 mt-0.5">{posts} posts</p>
    </div>
);

export const RightSidebar: React.FC<RightSidebarProps> = ({ user }) => {
  return (
    <div className="space-y-6">
        {/* Market Stats */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2 text-green-400" />
                Market Pulse
            </h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">$UBT Price</span>
                    <span className="text-white font-mono font-bold">$1.00 USD</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">CCAP Rate</span>
                    <span className="text-green-400 font-mono font-bold">~0.04 UBT</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Active Ventures</span>
                    <span className="text-white font-mono font-bold">12</span>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Community Goal Progress</p>
            </div>
        </div>

        {/* Trending */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2 px-2">What's happening</h3>
            <TrendItem tag="#SolarFarming" posts="1.2k" />
            <TrendItem tag="#BulawayoTech" posts="856" />
            <TrendItem tag="New Proposals" posts="420" />
            <TrendItem tag="#UbuntuEconomy" posts="5.4k" />
        </div>

        {/* Suggested */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2 text-blue-400" />
                Who to follow
            </h3>
            <div className="space-y-4">
                {/* Placeholders for suggested users */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                        <div>
                            <p className="text-sm font-bold text-white">Sarah M.</p>
                            <p className="text-xs text-gray-500">@sarah_tech</p>
                        </div>
                    </div>
                    <button className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold hover:bg-gray-200">Follow</button>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                        <div>
                            <p className="text-sm font-bold text-white">David K.</p>
                            <p className="text-xs text-gray-500">@david_agri</p>
                        </div>
                    </div>
                    <button className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold hover:bg-gray-200">Follow</button>
                </div>
            </div>
        </div>
        
        <div className="text-xs text-gray-600 px-2 leading-relaxed">
            <p>© 2025 Global Commons Network.</p>
            <p>Privacy · Terms · Cookies · Imprint</p>
        </div>
    </div>
  );
};
