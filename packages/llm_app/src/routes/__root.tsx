import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ApolloClient, InMemoryCache, ApolloProvider, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { ThemeProvider, ThemeToggle } from '../components/theme';
import { Heart } from 'lucide-react';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_API_URL,
  }),
);

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_API_URL,
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export const Route = createRootRoute({
  component: () => {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>
          <div className="h-screen bg-white dark:bg-gray-900 dark:text-white transition-colors">
            <nav className="p-4 bg-gradient-to-r from-pink-100/80 to-purple-100/80 dark:from-pink-950/50 dark:to-purple-950/50 backdrop-blur-sm shadow-lg">
              <div className="max-w-7xl mx-auto flex items-center">
                {/* Logo/Brand */}
                <div className="flex items-center gap-2 mr-8">
                  <Heart className="w-6 h-6 text-pink-400 dark:text-pink-300 animate-pulse" />
                  <span className="font-bold text-lg text-pink-600 dark:text-pink-300">
                    Kawaii App ٩(◕‿◕｡)۶
                  </span>
                </div>

                {/* Navigation Links */}
                <div className="flex gap-6">
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-full font-medium
                         bg-white/50 dark:bg-gray-800/50 
                         hover:bg-pink-200 dark:hover:bg-pink-800
                         [&.active]:bg-pink-200 dark:[&.active]:bg-pink-800
                         [&.active]:text-pink-700 dark:[&.active]:text-pink-200
                         transition-all duration-200 ease-in-out"
                  >
                    Home ♡
                  </Link>
                  <Link
                    to="/chat"
                    className="px-4 py-2 rounded-full font-medium
                         bg-white/50 dark:bg-gray-800/50 
                         hover:bg-pink-200 dark:hover:bg-pink-800
                         [&.active]:bg-pink-200 dark:[&.active]:bg-pink-800
                         [&.active]:text-pink-700 dark:[&.active]:text-pink-200
                         transition-all duration-200 ease-in-out"
                  >
                    Chat ♥
                  </Link>
                </div>
                {/* Theme Toggle */}
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
            </nav>

            <main className="h-[calc(100vh-73px)]">
              <Outlet />
            </main>
            <TanStackRouterDevtools />
          </div>
        </ThemeProvider>
      </ApolloProvider>
    );
  },
});
