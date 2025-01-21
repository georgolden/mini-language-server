import { Suspense } from 'react';
import KawaiiChat from './chat';
import { ChatSidebar } from './sidebar';
import { ChatCreation } from './modal';
import { useSelectChat } from '@hooks/apollo/chat';
import { Loader2 } from 'lucide-react';

const KawaiiChatManager = () => {
  const { queryRef, selectChat } = useSelectChat();

  return (
    <div className="flex h-full w-full gap-4 ">
      <div className="w-64 bg-pink-50 dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-pink-700 dark:text-pink-200">Chats ♥(◕‿◕)♥</h2>
          <ChatCreation />
          <ChatSidebar selectChat={selectChat} />
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
