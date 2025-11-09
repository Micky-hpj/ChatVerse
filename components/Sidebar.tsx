import React from 'react';
import { PlusIcon, BotIcon, ChatHistoryIcon } from './Icons';
import type { ChatHistoryItem } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  chatHistory: ChatHistoryItem[];
  currentChatId: string | null;
  onLoadChat: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChat, chatHistory, currentChatId, onLoadChat }) => {
  return (
    <aside className="flex-shrink-0 w-16 md:w-64 bg-gray-900/70 p-2 md:p-4 flex flex-col items-center md:items-stretch border-r border-gray-700">
      <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
        <BotIcon className="w-8 h-8 flex-shrink-0"/>
        <span className="hidden md:inline text-xl font-bold">ChatVerse</span>
      </div>
      <button
        onClick={onNewChat}
        className="flex items-center justify-center md:justify-start gap-2 w-full p-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5 flex-shrink-0" />
        <span className="hidden md:inline">New Chat</span>
      </button>

      <div className="flex-1 mt-6 overflow-y-auto space-y-1">
        <h2 className="hidden md:block text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Chat History
        </h2>
        {chatHistory.slice().reverse().map((chat) => (
          <button
            key={chat.id}
            onClick={() => onLoadChat(chat.id)}
            className={`w-full flex items-center justify-center md:justify-start gap-3 p-2 rounded-lg text-sm text-left truncate transition-colors ${
              currentChatId === chat.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title={chat.title}
          >
            <ChatHistoryIcon className="w-4 h-4 flex-shrink-0"/>
            <span className="hidden md:inline flex-1">{chat.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
