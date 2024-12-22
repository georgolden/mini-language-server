import { createLazyFileRoute } from '@tanstack/react-router';
import KawaiiChat, { type Message } from '../components/chat';
import { useEffect, useRef, useState } from 'react';

export const Route = createLazyFileRoute('/chat')({
  component: ChatRoute,
});

function ChatRoute() {
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to server nya~! ٩(◕‿◕｡)۶');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setMessages((prev) => [
        ...prev,
        {
          role: data.role,
          content: data.content,
          timestamp: new Date(),
        },
      ]);
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
      wsRef.current.send(
        JSON.stringify({
          message: content,
        }),
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content,
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="p-2 h-5/6">
      <KawaiiChat messages={messages} onSendMessage={handleSendMessage} />
    </div>
  );
}
