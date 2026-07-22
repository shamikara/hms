export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface SessionPayload {
  userId: string;
  role: string;
  expiresAt: Date;
}
