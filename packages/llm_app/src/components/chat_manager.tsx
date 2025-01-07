import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import KawaiiChat from './chat';
import Modal from './modal';
import { trpc } from '../trpc';

const KawaiiChatManager = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState('default');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: chats = [] } = trpc.getChats.useQuery();

  const createChatMutation = trpc.createChat.useMutation({
    onSuccess: (newChat) => {
      setSelectedChatId(newChat.id);
      handleSelectChat(newChat.id);
      setModalOpen(false);
      // Invalidate chats query to refetch
      queryClient.invalidateQueries(['getChats']);
    },
  });

  const selectChatMutation = trpc.selectChat.useMutation({
    onSuccess: () => setConnected(true),
  });

  const sendMessageMutation = trpc.sendMessage.useMutation();

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    createChatMutation.mutate({
      title: newChatTitle,
      type: workspaceType,
      description: newChatDescription,
    });
    setNewChatTitle('');
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    selectChatMutation.mutate(chatId);
  };

  const handleConnect = () => {
    if (selectedChatId) {
      selectChatMutation.mutate(selectedChatId);
    }
  };

  const handleSendMessage = (content) => {
    if (selectedChatId && connected) {
      sendMessageMutation.mutate({
        chatId: selectedChatId,
        content,
      });
    }
  };

  return (
    <div className="flex h-full w-full gap-4 ">
      <div className="w-64 bg-pink-50 dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-pink-700 dark:text-pink-200">Chats ♥(◕‿◕)♥</h2>
          <button
            type="submit"
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       bg-pink-400 dark:bg-pink-700 text-white rounded-lg
                       hover:bg-pink-500 dark:hover:bg-pink-700 
                       disabled:opacity-50 transition-colors"
          >
            {isCreatingChat ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Create Chat
          </button>
          <Modal title="Create new chat" onClose={() => setModalOpen(false)} isOpen={isModalOpen}>
            <form className="flex gap-4 flex-col" onSubmit={handleCreateChat}>
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="New chat title..."
                className="w-full px-3 py-2 rounded-lg border-2 border-pink-200 
                       dark:border-pink-700 dark:bg-gray-900 dark:text-white 
                       focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
              />
              <select
                value={workspaceType}
                onChange={(e) => setWorkspaceType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-pink-200 
             dark:border-pink-700 dark:bg-gray-900 dark:text-white
             focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
              >
                <option value="default">Default Chat</option>
                <option value="programming">Programming Workspace</option>
              </select>
              <textarea
                value={newChatDescription}
                onChange={(e) => setNewChatDescription(e.target.value)}
                placeholder="New chat description..."
                className="resize-none w-full px-3 py-2 rounded-lg border-2 border-pink-200 
                       dark:border-pink-700 dark:bg-gray-900 h-32 dark:text-white
                       focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={isCreatingChat || !newChatTitle.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       bg-pink-400 dark:bg-pink-700 text-white rounded-lg
                       hover:bg-pink-500 dark:hover:bg-pink-700 
                       disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </form>
          </Modal>
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                type="button"
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`w-full px-4 py-2 rounded-lg text-left transition-colors
                         ${
                           selectedChatId === chat.id
                             ? 'bg-pink-200 dark:bg-pink-700'
                             : 'hover:bg-pink-100 dark:hover:bg-pink-800'
                         }`}
              >
                {chat.title}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleConnect}
          className={`mt-auto w-full px-4 py-2 rounded-lg transition-colors
                   ${
                     connected ? 'bg-green-400 dark:bg-green-600' : 'bg-pink-400 dark:bg-pink-700'
                   } text-white`}
        >
          {connected ? 'Connected nya!!' : 'Connect'}
        </button>
      </div>
      <div className="flex-1">
        {selectedChatId ? (
          <KawaiiChat messages={messages} connected={connected} onSendMessage={handleSendMessage} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a chat or create a new one! (◕‿◕✿)
          </div>
        )}
      </div>
    </div>
  );
};

export default KawaiiChatManager;
