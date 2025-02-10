import { createFileRoute } from '@tanstack/react-router';
import KawaiiChatManager from '@components/chat/chat_manager';
import ErrorBoundary from '@components/error';
import { createProtectedLoader } from '@components/apollo';

export const Route = createFileRoute('/')({
  loader: createProtectedLoader(),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <div className="h-full p-4">
      <ErrorBoundary>
        <KawaiiChatManager />
      </ErrorBoundary>
    </div>
  );
}
