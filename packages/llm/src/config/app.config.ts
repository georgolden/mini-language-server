import 'dotenv/config';

const { env } = process;

export const HOST = env.HOST || 'localhost';
export const PORT =
  typeof env.PORT === 'string' ? Number.parseInt(env.PORT, 10) : 3002;
export const CORS_ORIGIN = env.CORS_ORIGIN || 'http://localhost:5173';
export const ANTHROPIC_API = env.ANTHROPIC_API;
