import { createProtectedLoader } from '@components/apollo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  loader: createProtectedLoader(),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/settings"!</div>;
}
