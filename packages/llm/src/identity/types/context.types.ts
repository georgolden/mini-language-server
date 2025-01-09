import { Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export interface Context {
  req: AuthenticatedRequest;
  res: Response;
}
