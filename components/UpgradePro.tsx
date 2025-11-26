import React from 'react';
import { StarIcon } from './Icons';

interface UpgradeProProps {
    isPro: boolean;
    messageCount: number;
    limit: number;
    onUpgrade: () => void;
}

export const UpgradePro: React.FC<UpgradeProProps> = ({ isPro, messageCount, limit, onUpgrade }) => {
    if (isPro) {
        return (
            <div className="p-3 bg-green-900/50 border border-green-700/60 rounded-lg text-center">
                <p className="text-sm font-semibold text-green-300">
                    You have ChatVerse Pro! ✨
                </p>
            </div>
        )
    }

    const percentage = Math.min((messageCount / limit) * 100, 100);

    return (
        <div className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg space-y-3">
            <div>
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-medium text-gray-300">Daily Messages</span>
                    <span className="text-gray-400">{messageCount} / {limit}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
            <button
                onClick={onUpgrade}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-md hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
            >
                <StarIcon className="w-4 h-4" />
                Upgrade to Pro
            </button>
        </div>
    );
};