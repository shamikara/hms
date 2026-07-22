import prisma from "@/core/db/prisma";
import { RegisterFormValues } from "../validations/auth.schema";

export const AuthRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async createUser(data: RegisterFormValues, passwordHash: string, roleId: string) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
      },
    });
  },
};
