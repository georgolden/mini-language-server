import { Test } from '@nestjs/testing';
import { OAuthService } from './oauth.service.js';
import { GitHubUser, GoogleUser } from '../types/oauth.types.js';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let fetchMock: jest.Mock;

  const mockGitHubUser: GitHubUser = {
    id: 123,
    name: 'GitHub User',
    login: 'githubuser',
    email: 'github@example.com',
    avatar_url: 'http://avatar.url',
    node_id: 'node123',
    gravatar_id: 'gravatar123',
    url: 'http://api.github.com/users/githubuser',
    html_url: 'http://github.com/githubuser',
    followers_url: 'http://api.github.com/users/githubuser/followers',
    following_url: 'http://api.github.com/users/githubuser/following',
    gists_url: 'http://api.github.com/users/githubuser/gists',
    starred_url: 'http://api.github.com/users/githubuser/starred',
    subscriptions_url: 'http://api.github.com/users/githubuser/subscriptions',
    organizations_url: 'http://api.github.com/users/githubuser/orgs',
    repos_url: 'http://api.github.com/users/githubuser/repos',
    events_url: 'http://api.github.com/users/githubuser/events',
    received_events_url:
      'http://api.github.com/users/githubuser/received_events',
    type: 'User',
    site_admin: false,
    company: 'GitHub',
    blog: 'https://github.blog',
    location: 'San Francisco',
    hireable: true,
    bio: 'Developer',
    twitter_username: 'githubuser',
    public_repos: 10,
    public_gists: 5,
    followers: 100,
    following: 50,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockGoogleUser: GoogleUser = {
    id: '456',
    email: 'google@example.com',
    verified_email: true,
    name: 'Google User',
    given_name: 'Google',
    family_name: 'User',
    picture: 'http://picture.url',
    locale: 'en',
    hd: 'example.com',
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const moduleRef = await Test.createTestingModule({
      providers: [OAuthService],
    }).compile();

    oauthService = moduleRef.get<OAuthService>(OAuthService);
  });

  describe('getGitHubUser', () => {
    it('should fetch GitHub user data successfully', async () => {
      fetchMock
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'github_token' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockGitHubUser),
        });

      const result = await oauthService.getGitHubUser('test_code');
      expect(result).toEqual(mockGitHubUser);
    });
  });

  describe('getGoogleUser', () => {
    it('should fetch Google user data successfully', async () => {
      fetchMock
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'google_token',
              id_token: 'google_id_token',
            }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockGoogleUser),
        });

      const result = await oauthService.getGoogleUser('test_code');
      expect(result).toEqual(mockGoogleUser);
    });
  });

  describe('getGoogleAuthURL', () => {
    it('should return valid Google OAuth URL', () => {
      const url = oauthService.getGoogleAuthURL();
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });
  });
});
