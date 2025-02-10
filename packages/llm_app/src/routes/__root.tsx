import { createRootRoute } from '@tanstack/react-router';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@components/theme';
import { AppShell, client } from '@components/apollo';

// Root route with authentication handling
export const Route = createRootRoute({
  component: () => {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </ApolloProvider>
    );
  },
});
