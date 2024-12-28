import { createLazyFileRoute } from '@tanstack/react-router';
import KawaiiChat, { type Message } from '../components/chat';
import { useEffect, useRef, useState } from 'react';

export const Route = createLazyFileRoute('/chat')({
  component: ChatRoute,
});

function ChatRoute() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3002/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to server nya~! ٩(◕‿◕｡)۶');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message') {
        console.log(data.messages);
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
            timestamp: new Date(),
          })),
        ]);
      } else if (data.type === 'mcp-connect') {
        setConnected(data.connected);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error nyaa!', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleSendMessage = (content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(content);
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          message: content,
        }),
      );
    }
  };

  const handleConnect = () => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'mcp-connect',
      }),
    );
  };

  return (
    <div className="flex mx-auto w-7/12 gap-12 p-2 h-5/6">
      <KawaiiChat messages={messages} connected={connected} onSendMessage={handleSendMessage} />
      <div>
        <button onClick={handleConnect} className="bg-sky-500 rounded-2xl h-fit p-5" type="button">
          Connect
        </button>
        <p>{connected ? 'Connected nya!!' : 'Disconnected :('}</p>
      </div>
    </div>
  );
}
