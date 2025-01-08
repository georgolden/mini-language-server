import { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';

export interface Context {
  req: {
    headers: {
      authorization?: string;
    };
  };
}

export const createContext = async ({ req }: CreateWSSContextFnOptions): Promise<Context> => {
  // For WebSocket connections, headers are available in the connectionParams
  const headers = (req as any).connectionParams?.headers || {};
  
  return {
    req: {
      headers
    }
  };
};
