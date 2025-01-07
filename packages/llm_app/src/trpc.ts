import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@almighty/llm';

export const trpc = createTRPCReact<AppRouter>();
