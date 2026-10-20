import bcrypt from "bcryptjs";
import { AuthRepository } from "../repositories/auth.repository";
import { LoginFormValues, RegisterFormValues } from "../validations/auth.schema";
import { AuthUser, GUEST_ROLE } from "../types";

export const AuthService = {
  async register(data: RegisterFormValues, roleId: string): Promise<AuthUser> {
    const existingUser = await AuthRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("Email is already in use.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await AuthRepository.createUser(data, passwordHash, roleId);

    // A newly registered account has no employee record, so it holds no
    // staff privileges. Roles are granted by assigning the user to a
    // property, never by signing up.
    return {
      id: user.id,
      email: user.email,
      firstName: "",
      lastName: "",
      role: GUEST_ROLE,
      roles: [],
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

    // Resolve the real role from the database. A user without an employee
    // record — a guest, say — gets GUEST and no staff privileges. Returning a
    // fixed SUPER_ADMIN here previously handed every account, guests
    // included, full access to the operations area.
    const profile = await AuthRepository.findRolesForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      role: profile?.roles[0] ?? GUEST_ROLE,
      roles: profile?.roles ?? [],
    };
  },
};
