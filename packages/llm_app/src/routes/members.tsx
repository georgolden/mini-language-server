import { createProtectedLoader } from '@components/apollo';
import LabMembers from '@components/members';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/members')({
  loader: createProtectedLoader(),
  component: RouteComponent,
});

function RouteComponent() {
  return <LabMembers />;
}
