import prisma from "@/core/db/prisma";
import { RegisterFormValues } from "../validations/auth.schema";

export const AuthRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  },

  async createUser(data: RegisterFormValues, passwordHash: string, roleId: string) {
    return prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        roleId,
      },
      include: { role: true },
    });
  },
};
