import { createFileRoute } from '@tanstack/react-router';
import { GithubCallback } from '@components/auth';

export const Route = createFileRoute('/auth/github/callback')({
  component: RouteComponent,
});

function RouteComponent() {
  return <GithubCallback />;
}
