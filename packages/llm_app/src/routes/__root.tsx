import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@components/theme';
import { client } from '@components/apollo';
import Header from '@components/header';

// Root route with authentication handling
export const Route = createRootRoute({
  component: () => {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>
          <Header>
            <Outlet />
          </Header>
        </ThemeProvider>
      </ApolloProvider>
    );
  },
});
