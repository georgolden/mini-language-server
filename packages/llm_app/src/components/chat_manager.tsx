import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import KawaiiChat from './chat';

const KawaiiChatManager = () => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = React.useRef<WebSocket>(null!);

  React.useEffect(() => {
    const ws = new WebSocket('ws://localhost:3002/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to server nya~! ٩(◕‿◕｡)۶');
      fetchChats();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'message':
          setMessages((prev) => [
            ...prev,
            ...data.messages.map((el) => ({
              role: el.role,
              content:
                typeof el.content === 'string'
                  ? el.content
                  : Array.isArray(el.content)
                    ? el.content.map((arr) => (arr.text ? arr.text : arr.content)).join('\n')
                    : '',
              timestamp: new Date(data.timestamp),
            })),
          ]);
          break;
        case 'mcp-connect':
          setConnected(data.connected);
          break;
        case 'chat-history':
          setMessages(
            data.messages.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          );
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchChats = async () => {
    const response = await fetch('/api/chats');
    const data = await response.json();
    setChats(data);
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    setIsCreatingChat(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChatTitle }),
      });
      const newChat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      setNewChatTitle('');
      setSelectedChatId(newChat.id);
      wsRef.current.send(
        JSON.stringify({
          type: 'select-chat',
          chatId: newChat.id,
        }),
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    wsRef.current.send(
      JSON.stringify({
        type: 'select-chat',
        chatId,
      }),
    );
  };

  const handleConnect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mcp-connect',
        }),
      );
    }
  };

  const handleSendMessage = (content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedChatId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          message: content,
        }),
      );
    }
  };

  return (
    <div className="flex h-full w-full gap-4 ">
      {/* Sidebar */}
      <div className="w-64 bg-pink-50 dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-pink-700 dark:text-pink-200">Chats ♥(◕‿◕)♥</h2>

          {/* Create new chat form */}
          <form onSubmit={handleCreateChat} className="space-y-2">
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="New chat title..."
              className="w-full px-3 py-2 rounded-lg border-2 border-pink-200 
                       dark:border-pink-700 dark:bg-gray-900 
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
              {isCreatingChat ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create Chat
            </button>
          </form>

          {/* Chat list */}
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
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

        {/* Connect button */}
        <button
          onClick={handleConnect}
          className={`mt-auto w-full px-4 py-2 rounded-lg transition-colors
                   ${
                     connected ? 'bg-green-400 dark:bg-green-600' : 'bg-pink-400 dark:bg-pink-700'
                   } text-white`}
        >
          {connected ? 'Connected nya!!' : 'Connect'}
        </button>
      </div>

      {/* Main chat area */}
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
