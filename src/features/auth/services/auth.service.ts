import bcrypt from "bcryptjs";
import { AuthRepository } from "../repositories/auth.repository";
import { LoginFormValues, RegisterFormValues } from "../validations/auth.schema";
import { AuthUser } from "../types";

export const AuthService = {
  async register(data: RegisterFormValues, roleId: string): Promise<AuthUser> {
    const existingUser = await AuthRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("Email is already in use.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await AuthRepository.createUser(data, passwordHash, roleId);

    return {
      id: user.id,
      email: user.email,
      firstName: "System",
      lastName: "User",
      role: "SUPER_ADMIN",
    };
  },

  async login(data: LoginFormValues): Promise<AuthUser> {
    const user = await AuthRepository.findUserByEmail(data.email);
    if (!user) {
      throw new Error("Invalid credentials.");
    }

    if (!user.passwordHash) {
      throw new Error("Invalid credentials.");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials.");
    }

    if (!user.isActive) {
      throw new Error("Account is disabled.");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: "System",
      lastName: "User",
      role: "SUPER_ADMIN",
    };
  },
};
