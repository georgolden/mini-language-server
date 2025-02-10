import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { type QueryRef, useReadQuery } from '@apollo/client';
import { ContentItemType, type Message, type GetChatWithMessagesQuery } from '../../gql/graphql';
import { useSubscribeChat } from '@hooks/apollo/chat';
import { formatTimestamp } from '@utils/datetime';

interface KawaiiChatProps {
  queryRef: QueryRef<GetChatWithMessagesQuery>;
}

const renderContent = (content: Message['content']) => {
  if (typeof content === 'string') {
    return content;
  }

  return content.map((item, index) => {
    switch (item.type) {
      case ContentItemType.Text:
        return <div key={index}>{item.text}</div>;
      case ContentItemType.ToolUse:
        return (
          <div key={index} className="bg-pink-100 dark:bg-pink-900 p-2 rounded-lg my-1">
            <div className="text-xs text-pink-600 dark:text-pink-300">Using tool: {item.name}</div>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(item.input, null, 2)}</pre>
          </div>
        );
      case ContentItemType.ToolResult:
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

const KawaiiChat = ({ queryRef }: KawaiiChatProps) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: { chat },
  } = useReadQuery(queryRef);

  const [currentChatId, setCurrentChatId] = useState(chat.id);
  useEffect(() => {
    if (chat.id !== currentChatId) {
      setCurrentChatId(chat.id);
    }
  }, [chat.id, currentChatId]);

  const { messages, sendMessage } = useSubscribeChat({
    onCompleted: () => setInputText(''),
    chatId: chat.id,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage({
      variables: {
        chatId: chat.id,
        content: { type: ContentItemType.Text, text: inputText },
        role: 'user',
      },
    });
    setInputText('');
  };

  return (
    <div className="flex flex-col dark:text-white rounded-2xl overflow-hidden h-full w-full bg-pink-50 dark:bg-gray-900 relative">
      {/* Kawaii Background Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="kawaii-pattern-light" patternUnits="userSpaceOnUse" width="80" height="80">
              {/* Dense Hearts */}
              <path
                d="M20,20 a5,5 0 0,1 10,0 a5,5 0 0,1 10,0 q0,10 -10,12.5 q-10,-2.5 -10,-12.5"
                fill="#FDA4AF"
                opacity="0.6"
              />
              <path
                d="M60,60 a4,4 0 0,1 8,0 a4,4 0 0,1 8,0 q0,8 -8,10 q-8,-2 -8,-10"
                fill="#FB7185"
                opacity="0.5"
              />

              {/* Flowers */}
              <path
                d="M50,30 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 m4,-4 a4,4 0 1,0 0,8 a4,4 0 1,0 0,-8"
                fill="#F9A8D4"
                opacity="0.5"
              />
              <path
                d="M15,50 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 m3,-3 a3,3 0 1,0 0,6 a3,3 0 1,0 0,-6"
                fill="#FCE7F3"
                opacity="0.6"
              />

              {/* Stars */}
              <path
                d="M70,15 l1.5,4.5 h4.5 l-3.75,3 l1.5,4.5 l-3.75,-3 l-3.75,3 l1.5,-4.5 l-3.75,-3 h4.5 z"
                fill="#F43F5E"
                opacity="0.4"
              />
              <path
                d="M25,70 l1,3 h3 l-2.5,2 l1,3 l-2.5,-2 l-2.5,2 l1,-3 l-2.5,-2 h3 z"
                fill="#FF8FAB"
                opacity="0.5"
              />

              {/* Tiny dots */}
              <circle cx="40" cy="75" r="1.5" fill="#F43F5E" opacity="0.4" />
              <circle cx="75" cy="40" r="1.5" fill="#F43F5E" opacity="0.4" />
            </pattern>

            <pattern id="kawaii-pattern-dark" patternUnits="userSpaceOnUse" width="80" height="80">
              {/* Dense Hearts */}
              <path
                d="M20,20 a5,5 0 0,1 10,0 a5,5 0 0,1 10,0 q0,10 -10,12.5 q-10,-2.5 -10,-12.5"
                fill="#831843"
                opacity="0.6"
              />
              <path
                d="M60,60 a4,4 0 0,1 8,0 a4,4 0 0,1 8,0 q0,8 -8,10 q-8,-2 -8,-10"
                fill="#BE185D"
                opacity="0.5"
              />

              {/* Flowers */}
              <path
                d="M50,30 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 m4,-4 a4,4 0 1,0 0,8 a4,4 0 1,0 0,-8"
                fill="#9D174D"
                opacity="0.5"
              />
              <path
                d="M15,50 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 m3,-3 a3,3 0 1,0 0,6 a3,3 0 1,0 0,-6"
                fill="#831843"
                opacity="0.6"
              />

              {/* Stars */}
              <path
                d="M70,15 l1.5,4.5 h4.5 l-3.75,3 l1.5,4.5 l-3.75,-3 l-3.75,3 l1.5,-4.5 l-3.75,-3 h4.5 z"
                fill="#BE185D"
                opacity="0.4"
              />
              <path
                d="M25,70 l1,3 h3 l-2.5,2 l1,3 l-2.5,-2 l-2.5,2 l1,-3 l-2.5,-2 h3 z"
                fill="#9D174D"
                opacity="0.5"
              />

              {/* Tiny dots */}
              <circle cx="40" cy="75" r="1.5" fill="#BE185D" opacity="0.4" />
              <circle cx="75" cy="40" r="1.5" fill="#BE185D" opacity="0.4" />
            </pattern>

            <linearGradient id="kawaii-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF1F2" />
              <stop offset="50%" stopColor="#FCE7F3" />
              <stop offset="100%" stopColor="#FFE4E6" />
            </linearGradient>

            <linearGradient id="kawaii-gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#500724" />
              <stop offset="50%" stopColor="#4C0519" />
              <stop offset="100%" stopColor="#831843" />
            </linearGradient>
          </defs>

          <rect
            width="100%"
            height="100%"
            fill="url(#kawaii-gradient-light)"
            className="dark:hidden"
          />
          <rect
            width="100%"
            height="100%"
            fill="url(#kawaii-gradient-dark)"
            className="hidden dark:block"
          />
          <rect
            width="100%"
            height="100%"
            fill="url(#kawaii-pattern-light)"
            className="dark:hidden"
            opacity="0.4"
          />
          <rect
            width="100%"
            height="100%"
            fill="url(#kawaii-pattern-dark)"
            className="hidden dark:block"
            opacity="0.4"
          />
        </svg>
      </div>

      {/* Rest of the component structure remains the same */}
      <div className="bg-pink-200/80 dark:bg-pink-800/80 p-4 text-center shadow-md relative">
        <h1 className="text-2xl font-bold text-pink-700 dark:text-pink-100">
          Mochi-chan's Chatroom ٩(◕‿◕｡)۶
        </h1>
      </div>

      {/* Messages with slightly transparent background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages?.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] flex flex-col gap-2 px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-pink-200/90 dark:bg-pink-800/90 rounded-tr-sm'
                  : 'bg-white/90 dark:bg-gray-700/90 rounded-tl-sm'
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

      {/* Input form with slightly transparent background */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-pink-200/80 dark:bg-gray-800/80 shadow-lg relative"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here, onii-chan! (◕‿◕✿)"
            className="flex-1 px-4 py-2 rounded-full border-2 border-pink-200 
                     dark:border-pink-700 dark:bg-gray-900/90 dark:text-white
                     focus:outline-none focus:border-pink-400 dark:focus:border-pink-500
                     transition-colors dark:disabled:placeholder-gray-600"
          />
          <button
            type="submit"
            className="bg-pink-400 dark:bg-pink-600 text-white p-2 rounded-full
                     hover:bg-pink-500 dark:hover:bg-pink-700 transition-colors
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
