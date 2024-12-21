import { createLazyFileRoute } from '@tanstack/react-router';
import KawaiiLogger from '../components/logger';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Logger chan</h3>
      <KawaiiLogger />
    </div>
  );
}
