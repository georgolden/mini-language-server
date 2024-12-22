import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <div className='h-screen'>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>{' '}
        <Link to="/chat" className="[&.active]:font-bold">
          Chat
        </Link>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools />
    </div>
  ),
});
