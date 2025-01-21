import { Suspense, useState } from 'react';
import { useReadChats } from '@hooks/apollo/chat';

export const ChatSidebar = ({ selectChat }) => {
  const [chatId, setChatId] = useState<number | null>(null);
  const { chats } = useReadChats();

  const handleSelect = (id: number) => {
    setChatId(id);
    selectChat(id);
  };

  return (
    <Suspense fallback={'Loading...'}>
      <div className="space-y-2">
        {chats.map((shallowChat) => (
          <button
            type="button"
            key={shallowChat.id}
            onClick={() => handleSelect(shallowChat.id)}
            className={`w-full px-4 py-2 rounded-lg text-left transition-colors
                           ${
                             chatId === shallowChat.id
                               ? 'bg-pink-200 dark:bg-pink-700'
                               : 'hover:bg-pink-100 dark:hover:bg-pink-800'
                           }`}
          >
            {shallowChat.title}
          </button>
        ))}
      </div>
    </Suspense>
  );
};
