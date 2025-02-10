import {
  type ApolloClient,
  gql,
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useCallback } from 'react';

export const ME = gql`
  query Me {
    me {
      id
      email
      name
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      id
      email
      name
    }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!, $name: String!) {
    signUp(email: $email, password: $password, name: $name) {
      id
      email
      name
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const GITHUB_AUTH = gql`
  query GithubAuth($input: SocialAuthInput!) {
    githubAuth(input: $input) {
      id
      email
      name
    }
  }
`;

export const checkAuthentication = async (client: ApolloClient<any>) => {
  try {
    const { data } = await client.query({
      query: ME,
      fetchPolicy: 'network-only',
    });
    return !!data.me;
  } catch {
    return false;
  }
};

export const useAuth = () => {
  const [signInMutation] = useMutation(SIGN_IN);
  const [signUpMutation] = useMutation(SIGN_UP);
  const [logoutMutation] = useMutation(LOGOUT);
  const apolloClient = useApolloClient();

  const { data: userData, loading: isLoading } = useQuery(ME, {
    fetchPolicy: 'network-only',
  });

  const [githubAuthQuery] = useLazyQuery(GITHUB_AUTH);

  const signInWithGithub = useCallback(
    async (code: string) => {
      const { data } = await githubAuthQuery({
        variables: {
          input: { code },
        },
      });
      return data.githubAuth;
    },
    [githubAuthQuery],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data } = await signInMutation({
        variables: { email, password },
      });
      return data.signIn;
    },
    [signInMutation],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data } = await signUpMutation({
        variables: { email, password, name },
      });
      return data.signUp;
    },
    [signUpMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation();
    await apolloClient.clearStore();
  }, [logoutMutation, apolloClient]);

  return {
    isAuthenticated: !!userData?.me,
    isLoading,
    user: userData?.me,
    signIn,
    signUp,
    logout,
    signInWithGithub,
  };
};
