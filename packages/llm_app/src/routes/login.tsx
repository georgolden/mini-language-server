import { KawaiiLogin } from '@components/auth';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: search.redirect as string | undefined,
    };
  },
});

function RouteComponent() {
  return <KawaiiLogin />;
}
