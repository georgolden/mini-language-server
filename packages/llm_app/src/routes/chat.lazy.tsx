import { createLazyFileRoute } from '@tanstack/react-router';
import KawaiiChat from '../components/chat';
import { createASTAgent, createClaudeClient } from '@almighty/llm';
import { useEffect, useRef } from 'react';

export const Route = createLazyFileRoute('/chat')({
  component: About,
});

function About() {
  const chat = useRef(null);

  useEffect(() => {
    (async () => {
      const claude = createClaudeClient('');
      chat.current = await createASTAgent(claude);
    })();
  }, []);

  return (
    <div className="p-2 h-5/6">
      Hello Chat!
      <KawaiiChat onSendMessage={console.log} />
    </div>
  );
}
