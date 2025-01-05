import { createLazyFileRoute } from '@tanstack/react-router';
import KawaiiChatManager from '../components/chat_manager';

export const Route = createLazyFileRoute('/chat')({
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <div className="h-full p-4">
      <KawaiiChatManager />
    </div>
  );
}
