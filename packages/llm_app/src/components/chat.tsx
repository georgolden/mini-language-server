import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const KawaiiChat = ({ onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await onSendMessage(inputText);
      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

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

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden h-full max-w-3xl mx-auto bg-pink-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-pink-200  dark:bg-purple-900 p-4 text-center shadow-md">
        <h1 className="text-2xl font-bold text-pink-700 dark:text-pink-300">
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
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-pink-200 dark:bg-pink-800 rounded-tr-sm'
                  : 'bg-white dark:bg-gray-800 rounded-tl-sm'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {message.role === 'user' ? 'Onii-chan' : 'Mochi-chan'}
              </div>
              <div className="break-words">{renderContent(message?.content)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 shadow-lg">
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
