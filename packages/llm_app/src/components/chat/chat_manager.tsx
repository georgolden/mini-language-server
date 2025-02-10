import { Suspense, useState } from 'react';
import KawaiiChat from './chat';
import { ChatSidebar } from './sidebar';
import { ChatCreation } from './modal';
import { useSelectChat } from '@hooks/apollo/chat';
import { Loader2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';

const KawaiiChatManager = () => {
  const { queryRef, selectChat } = useSelectChat();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full gap-4">
      <div
        className={`relative transition-all duration-300 ease-in-out bg-pink-50 dark:bg-gray-800 rounded-2xl p-2 flex flex-col gap-4
          ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          type="button"
          className="absolute -right-3 top-8 bg-pink-200 dark:bg-pink-700 rounded-full p-1 hover:scale-110 transition-transform duration-200 shadow-lg"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-pink-700 dark:text-pink-200" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-pink-700 dark:text-pink-200" />
          )}
        </button>

        <div className="flex flex-col gap-2 justify-center items-center overflow-hidden">
          <div className="h-12 items-center  flex">
            <h2
              className={`text-xl font-bold  text-pink-700 dark:text-pink-200 transition-opacity duration-300
            `}
            >
              {isCollapsed ? <Heart /> : 'Chats'}
            </h2>
          </div>
          <ChatCreation isCollapsed={isCollapsed} />
          <ChatSidebar selectChat={selectChat} isCollapsed={isCollapsed} />
        </div>
      </div>

      <div className="flex-1">
        <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
          {queryRef ? (
            <KawaiiChat queryRef={queryRef} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a chat or create a new one! (◕‿◕✿)
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default KawaiiChatManager;
