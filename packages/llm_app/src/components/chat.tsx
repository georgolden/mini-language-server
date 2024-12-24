import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
  timestamp: Date;
}

interface KawaiiChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

const renderContent = (content) => {
  console.log('CONTENT: ', content);
  if (typeof content === 'string') {
    return content;
  }

  return content.map((item, index) => {
    switch (item.type) {
      case 'text':
        return <div key={index}>{item.text}</div>;
      case 'tool_use':
        return (
          <div key={index} className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg my-1">
            <div className="text-xs text-purple-600 dark:text-purple-300">
              Using tool: {item.name}
            </div>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(item.input, null, 2)}</pre>
          </div>
        );
      case 'tool_result':
        return (
          <div key={index} className="bg-green-100 dark:bg-green-900 p-2 rounded-lg my-1">
            <div className="text-xs text-green-600 dark:text-green-300">Tool result:</div>
            <div>{item.content}</div>
          </div>
        );
      default:
        return null;
    }
  });
};

const KawaiiChat = ({ onSendMessage, messages }: KawaiiChatProps) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col dark:text-white rounded-2xl overflow-hidden h-full max-w-3xl mx-auto bg-pink-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-pink-200  dark:bg-purple-800 p-4 text-center shadow-md">
        <h1 className="text-2xl font-bold text-pink-700 dark:text-pink-100">
          Mochi-chan's Chatroom ٩(◕‿◕｡)۶
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] flex flex-col gap-2 px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-pink-200 dark:bg-purple-800 rounded-tr-sm'
                  : 'bg-white dark:bg-gray-700 rounded-tl-sm'
              }`}
            >
              <div className="flex w-full gap-4 items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {message.role === 'user' ? 'Onii-chan' : 'Mochi-chan'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
              <div className="break-words">{renderContent(message?.content)}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-pink-200 dark:bg-gray-800 shadow-lg">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here, onii-chan! (◕‿◕✿)"
            className="flex-1 px-4 py-2 rounded-full border-2 border-pink-200 
                     dark:border-purple-700 dark:bg-gray-900 dark:text-white
                     focus:outline-none focus:border-pink-400 dark:focus:border-purple-500
                     transition-colors"
          />
          <button
            type="submit"
            className="bg-pink-400 dark:bg-purple-600 text-white p-2 rounded-full
                     hover:bg-pink-500 dark:hover:bg-purple-700 transition-colors
                     disabled:opacity-50"
            disabled={!inputText.trim()}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default KawaiiChat;
