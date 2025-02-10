import { Suspense, useState } from 'react';
import { Heart, Sparkles, MessageCircle } from 'lucide-react';
import { useDeleteChat, useReadChats } from '@hooks/apollo/chat';
import ContextMenu from '@components/context';

export const ChatSidebar = ({ selectChat, isCollapsed }) => {
  const [chatId, setChatId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: number } | null>(
    null,
  );
  const { chats } = useReadChats();
  const { deleteChat } = useDeleteChat();

  const handleSelect = (id: number) => {
    setChatId(id);
    selectChat(id);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-4 text-pink-400">
          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </div>
      }
    >
      {chats.map((shallowChat) => (
        <button
          key={shallowChat.id}
          type="button"
          onClick={() => handleSelect(shallowChat.id)}
          onContextMenu={(e) => handleContextMenu(e, shallowChat.id)}
          onMouseEnter={() => setHoveredId(shallowChat.id)}
          onMouseLeave={() => setHoveredId(null)}
          className={`
            group flex items-center w-full p-2 h-12
            rounded-lg text-left transition-all duration-300
            border-2 relative cursor-pointer justify-center gap-4
            ${
              chatId === shallowChat.id
                ? 'bg-pink-200 border-pink-400 dark:bg-pink-700 dark:border-pink-500 scale-100 shadow-lg'
                : 'border-transparent hover:bg-pink-100 scale-90 dark:hover:bg-pink-800 hover:scale-95'
            }
          `}
        >
          {isCollapsed ? (
            <MessageCircle />
          ) : (
            <>
              <Heart
                className={`w-4 h-4 transition-opacity duration-300
                ${
                  hoveredId === shallowChat.id || chatId === shallowChat.id
                    ? 'opacity-100 text-pink-500'
                    : 'opacity-0'
                }`}
              />
              <span className="font-medium">{shallowChat.title}</span>
            </>
          )}
        </button>
      ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => {
            deleteChat(contextMenu.chatId);
            selectChat(undefined);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </Suspense>
  );
};

export default ChatSidebar;
