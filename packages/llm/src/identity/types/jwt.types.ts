import { JwtPayload } from 'jsonwebtoken';

export interface SessionJwtPayload extends JwtPayload {
  sessionId: number;
  user: {
    id: number;
    role: string;
  };
}
