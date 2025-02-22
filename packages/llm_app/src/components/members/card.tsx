import React, { memo } from 'react';
import { Brain, PenTool, Sparkles, MessageCircle, Settings } from 'lucide-react';

const MemberCard = ({ member }) => (
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div className="flex items-center gap-4 mb-4">
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-500/50 dark:to-purple-500/50 rounded-full opacity-75 blur-sm" />
        <img
          src={member.avatar}
          alt={member.name}
          className="relative w-16 h-16 rounded-full border-2 border-white dark:border-gray-700"
        />
      </div>
      <div>
        <h3 className="text-xl font-bold text-pink-600 dark:text-pink-300">{member.name}</h3>
        <p className="text-gray-700 dark:text-gray-300">{member.specialization}</p>
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Brain size={16} className="text-pink-500 dark:text-pink-400" />
        <span className="text-sm">Capabilities: {member.capabilities.length}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <PenTool size={16} className="text-pink-500 dark:text-pink-400" />
        <span className="text-sm">Tools: {member.tools.length}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Sparkles size={16} className="text-pink-500 dark:text-pink-400" />
        <span className="text-sm">Has System Prompt</span>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        type="button"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => member.onChat?.()}
      >
        <MessageCircle size={16} />
        Chat
      </button>
      <button
        type="button"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => member.onSettings?.()}
      >
        <Settings size={16} />
        Settings
      </button>
    </div>
  </div>
);

export default memo(MemberCard);
