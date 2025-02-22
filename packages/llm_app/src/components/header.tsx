import { type FC, memo } from 'react';
import { Link } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ThemeToggle } from './theme';
import { useAuth } from '@hooks/apollo/auth';

interface HeaderProps {
  children?: React.ReactNode;
}

const Header: FC<HeaderProps> = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();

  return (
    <div className="h-screen bg-white dark:bg-gray-900 dark:text-white transition-colors">
      <nav className="p-4 bg-gradient-to-r from-pink-100/80 to-purple-100/80 dark:from-pink-950/50 dark:to-purple-950/50 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center">
          <div className="flex items-center gap-2 mr-8">
            <span className="font-bold text-lg text-pink-600 dark:text-pink-300">LAB</span>
          </div>
          {isAuthenticated ? (
            <div className="flex gap-2">
              <Link
                to="/"
                className="px-4 py-2 rounded-full font-medium
                bg-white/50 dark:bg-gray-800/50 
                hover:bg-pink-200 dark:hover:bg-pink-800
                [&.active]:bg-pink-200 dark:[&.active]:bg-pink-800
                [&.active]:text-pink-700 dark:[&.active]:text-pink-200
                transition-all duration-200 ease-in-out"
              >
                Chat
              </Link>
              <Link
                to="/members"
                className="px-4 py-2 rounded-full font-medium
                bg-white/50 dark:bg-gray-800/50 
                hover:bg-pink-200 dark:hover:bg-pink-800
                [&.active]:bg-pink-200 dark:[&.active]:bg-pink-800
                [&.active]:text-pink-700 dark:[&.active]:text-pink-200
                transition-all duration-200 ease-in-out"
              >
                Memebers
              </Link>
              <Link
                to="/settings"
                className="px-4 py-2 rounded-full font-medium
                bg-white/50 dark:bg-gray-800/50 
                hover:bg-pink-200 dark:hover:bg-pink-800
                [&.active]:bg-pink-200 dark:[&.active]:bg-pink-800
                [&.active]:text-pink-700 dark:[&.active]:text-pink-200
                transition-all duration-200 ease-in-out"
              >
                Settings
              </Link>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                type="button"
                className="px-4 py-2 rounded-full font-medium
                  bg-white/50 dark:bg-gray-800/50 
                  hover:bg-pink-200 dark:hover:bg-pink-800
                  transition-all duration-200 ease-in-out"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-full font-medium
                  bg-white/50 dark:bg-gray-800/50 
                  hover:bg-pink-200 dark:hover:bg-pink-800
                  transition-all duration-200 ease-in-out"
              >
                Login
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="h-[calc(100vh-73px)]">{children}</main>
      <TanStackRouterDevtools />
    </div>
  );
};

export default memo(Header);
