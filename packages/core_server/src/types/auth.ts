export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  picture: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

export interface GitHubUserInfo {
  id: number
  email: string | null
  login: string
  name: string | null
}

declare module 'fastify' {
  interface Session {
    user?: {
      id: string
      email: string
      provider: 'google' | 'github'
      accessToken: string
    }
  }

  interface FastifyInstance {
    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        request: any
      ) => Promise<{ token: { access_token: string } }>
    }
    githubOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        request: any
      ) => Promise<{ token: { access_token: string } }>
    }
  }
}
