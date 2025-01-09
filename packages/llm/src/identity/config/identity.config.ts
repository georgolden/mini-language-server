import 'dotenv/config';

const { env } = process;

// JWT and Session configuration
export const SIGNING_KEY = env.SIGNING_KEY || 'your-default-signing-key';

// GitHub OAuth configuration used in OAuthService
export const GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;

// Google OAuth configuration used in OAuthService
export const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI = `${env.CORS_ORIGIN || 'http://localhost:3002'}/auth/google`;

// Cookie settings used in AuthService
export const COOKIE_MAX_AGE = 3.154e10; // 1 year
export const SECURE_COOKIE = env.NODE_ENV === 'production';
export const CORS_ORIGIN = env.CORS_ORIGIN || 'http://localhost:3002';
