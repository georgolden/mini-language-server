import { Injectable } from '@nestjs/common';
import {
  CORS_ORIGIN,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '../config/identity.config.js';

@Injectable()
export class OAuthService {
  async getGitHubUser(code: string) {
    const tokenResponse = await fetch(
      `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${code}`,
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
      },
    );

    const { access_token } = await tokenResponse.json();
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });

    return userResponse.json();
  }

  async getGoogleUser(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${CORS_ORIGIN}/auth/google`,
      }),
    });

    const { access_token, id_token } = await response.json();
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: { Authorization: `Bearer ${id_token}` },
      },
    );

    return userResponse.json();
  }

  getGoogleAuthURL() {
    if (!GOOGLE_CLIENT_ID)
      throw new Error('GOOGLE_CLIENT_ID is missing in dotenv!');

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.append('redirect_uri', `${CORS_ORIGIN}/auth/google`);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes.join(' '));
    return url.toString();
  }
}
