import 'dotenv/config';

const { env } = process;

export const HOST = env.HOST || 'localhost';
export const PORT =
  typeof env.PORT === 'string' ? Number.parseInt(env.PORT, 10) : 3002;
export const CORS_ORIGIN = env.CORS_ORIGIN || 'http://localhost:5173';
export const ANTHROPIC_API = env.ANTHROPIC_API;
export const OPENAI_API_KEY = env.OPENAI_API_KEY;
export const GROQ_API_KEY = env.GROQ_API_KEY;
export const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
export const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
export const GOOGLE_API_KEY = env.GOOGLE_API_KEY;
export const PERPLEXITY_API_KEY = env.PERPLEXITY_API_KEY;
export const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
export const XAI_API_KEY = env.XAI_API_KEY;
