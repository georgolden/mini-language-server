import { redirect } from '@tanstack/react-router';
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { ME } from '@hooks/apollo/auth';

// Apollo Client setup
const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_API_URL_WS,
  }),
);

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_API_URL,
  credentials: 'include', // Important for auth cookies
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// Separate component for the authenticated app shell

export const createProtectedLoader = () => {
  return async () => {
    try {
      const { data } = await client.query({
        query: ME,
        fetchPolicy: 'network-only',
      });

      if (!data.me) {
        throw redirect({
          to: '/login',
          search: {
            redirect: window.location.href,
          },
        });
      }

      return data.me;
    } catch (error) {
      throw redirect({
        to: '/login',
        search: {
          redirect: window.location.href,
        },
      });
    }
  };
};
