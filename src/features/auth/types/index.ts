import { RoleName } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleName;
}

export interface SessionPayload {
  userId: string;
  role: RoleName;
  expiresAt: Date;
}
