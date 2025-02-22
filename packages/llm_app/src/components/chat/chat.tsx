import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { type QueryRef, useReadQuery } from '@apollo/client';
import { ContentItemType, type GetChatWithMessagesQuery } from '../../gql/graphql';
import { useModels, useSubscribeChat } from '@hooks/apollo/chat';
import { ChatBackground } from './background';
import { ChatMessage } from './message';
import Modal from '@components/modal';
import { ModelSelect } from './model.select';

interface KawaiiChatProps {
  queryRef: QueryRef<GetChatWithMessagesQuery>;
}

interface ChatHeaderProps {
  title: string;
  onOpenSettings: () => void;
}

const ChatHeader: FC<ChatHeaderProps> = ({ title, onOpenSettings }) => {
  return (
    <header className="bg-pink-200/80 dark:bg-pink-800/80 p-4 flex items-center justify-between shadow-md relative">
      <h1 className="text-2xl font-bold text-pink-700 dark:text-pink-100">{title}</h1>

      <div className="flex items-center gap-4">
        <ModelSelect value={undefined} onChange={console.log} />

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-pink-300 dark:bg-pink-700 hover:bg-pink-400 dark:hover:bg-pink-600 transition-colors"
          aria-label="Open Settings"
          type="button"
        >
          <Settings className="w-5 h-5 text-pink-700 dark:text-pink-100" />
        </button>
      </div>
    </header>
  );
};

const SettingsModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kawaii Settings ⊂((・▽・))⊃" size="md">
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-pink-700 dark:text-pink-200">
            Personalization (◕‿◕✿)
          </h3>

          <div className="space-y-2">
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-pink-600 dark:text-pink-300"
            >
              Chat Background Theme
            </label>
            <select
              id="theme"
              className="w-full rounded-lg border-2 border-pink-200 dark:border-pink-700 p-2 bg-pink-50 dark:bg-gray-800"
            >
              <option value="sakura">Sakura Petals ✿</option>
              <option value="stars">Starry Night ⭐</option>
              <option value="hearts">Floating Hearts 💕</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="style"
              className="block text-sm font-medium text-pink-600 dark:text-pink-300"
            >
              Message Style
            </label>
            <select
              id="style"
              className="w-full rounded-lg border-2 border-pink-200 dark:border-pink-700 p-2 bg-pink-50 dark:bg-gray-800"
            >
              <option value="bubble">Bubble Style (｡♥‿♥｡)</option>
              <option value="flat">Flat Style ⊂((・▽・))⊃</option>
              <option value="pixel">Pixel Style (◕‿◕✿)</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const KawaiiChat: FC<KawaiiChatProps> = ({ queryRef }) => {
  const [inputText, setInputText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useReadQuery(queryRef);
  const chat = data?.chat;

  const { messages, sendMessage } = useSubscribeChat({
    onCompleted: () => setInputText(''),
    chatId: chat?.id ?? '',
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputText.trim();
    if (!trimmedInput || !chat?.id) return;

    sendMessage({
      variables: {
        chatId: chat.id,
        content: { type: ContentItemType.Text, text: trimmedInput },
        role: 'user',
      },
    });
    setInputText('');
  };

  if (!chat) return null;

  return (
    <div className="flex flex-col dark:text-white rounded-2xl overflow-hidden h-full w-full bg-pink-50 dark:bg-gray-900 relative">
      <ChatBackground />
      <ChatHeader title={chat.title} onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col relative">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

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
            aria-label="Send message"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </form>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default KawaiiChat;
