import prisma from "@/core/db/prisma";
import { RegisterFormValues } from "../validations/auth.schema";

export const AuthRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * The user's real roles and name, resolved through their employee record.
   *
   * Returns no roles for a user without an employee profile — a guest, for
   * instance. Callers must treat that as "no privileges" rather than
   * substituting a default, which is how every login previously ended up
   * with SUPER_ADMIN.
   */
  async findRolesForUser(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName: true,
        assignments: {
          select: { roles: { select: { role: { select: { name: true } } } } },
        },
      },
    });

    if (!employee) return null;

    const roles = new Set<string>();
    for (const assignment of employee.assignments) {
      for (const roleAssignment of assignment.roles) {
        roles.add(roleAssignment.role.name);
      }
    }

    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      roles: [...roles],
    };
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
