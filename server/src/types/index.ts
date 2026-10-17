import { Request } from 'express';

export type SessionType = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
export type SessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PauseRecord {
  start: string; // ISO string
  end?: string;  // ISO string, omitted if currently paused
}

export interface UserSessionPayload {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

// Extend Express Request to include typed user
declare global {
  namespace Express {
    interface User extends UserSessionPayload {}
  }
}

export interface AuthenticatedRequest extends Request {
  user: UserSessionPayload;
}
