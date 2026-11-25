import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "@/core/db/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeId: true,
  deletedAt: true,
  createdAt: true,
  user: { select: { id: true, email: true, isActive: true } },
  assignments: {
    select: {
      id: true,
      propertyId: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  },
} satisfies Prisma.EmployeeSelect;

export type StaffRow = Prisma.EmployeeGetPayload<{ select: typeof staffSelect }>;

export const StaffRepository = {
  /** Everyone assigned to the property, terminated employees excluded. */
  async listForProperty(propertyId: string, db: Db = prisma): Promise<StaffRow[]> {
    return db.employee.findMany({
      where: { deletedAt: null, assignments: { some: { propertyId } } },
      select: staffSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },

  async findForProperty(employeeId: string, propertyId: string, db: Db = prisma) {
    return db.employee.findFirst({
      where: { id: employeeId, deletedAt: null, assignments: { some: { propertyId } } },
      select: staffSelect,
    });
  },

  async findUserByEmail(email: string, db: Db = prisma) {
    return db.user.findUnique({ where: { email }, select: { id: true, employee: { select: { id: true } } } });
  },

  async propertyOrganization(propertyId: string, db: Db = prisma) {
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { organizationId: true },
    });
    return property?.organizationId ?? null;
  },

  /** Role rows by name, creating any the seed did not (the list can grow). */
  async ensureRoles(names: string[], db: Db = prisma) {
    for (const name of names) {
      await db.role.upsert({ where: { name }, update: {}, create: { name } });
    }
    return db.role.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
  },

  /** Active sign-ins at the property holding the role, for "last one" checks. */
  async countActiveWithRole(propertyId: string, roleName: string, db: Db = prisma) {
    return db.employee.count({
      where: {
        deletedAt: null,
        user: { isActive: true, deletedAt: null },
        assignments: {
          some: { propertyId, roles: { some: { role: { name: roleName } } } },
        },
      },
    });
  },

  async createStaff(
    input: {
      organizationId: string;
      propertyId: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      roleIds: string[];
    },
    db: Db = prisma,
  ) {
    const user = await db.user.create({
      data: { email: input.email, passwordHash: input.passwordHash, isActive: true, emailVerifiedAt: new Date() },
    });
    const employee = await db.employee.create({
      data: {
        userId: user.id,
        organizationId: input.organizationId,
        employeeId: input.employeeNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        assignments: {
          create: {
            propertyId: input.propertyId,
            roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
          },
        },
      },
      select: { id: true },
    });
    return employee;
  },

  async updateStaff(
    input: { employeeId: string; assignmentId: string; firstName: string; lastName: string; roleIds: string[] },
    db: Db = prisma,
  ) {
    await db.employee.update({
      where: { id: input.employeeId },
      data: { firstName: input.firstName, lastName: input.lastName },
    });
    await db.roleAssignment.deleteMany({ where: { assignmentId: input.assignmentId } });
    await db.roleAssignment.createMany({
      data: input.roleIds.map((roleId) => ({ assignmentId: input.assignmentId, roleId })),
    });
  },

  async setPassword(userId: string, passwordHash: string, db: Db = prisma) {
    // A password set by a manager also signs the person out everywhere.
    await db.user.update({ where: { id: userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  },

  async setActive(userId: string, active: boolean, db: Db = prisma) {
    // Switching off also retires their sessions at once (not "on next click"
    // of a check that might be skipped somewhere).
    await db.user.update({
      where: { id: userId },
      data: { isActive: active, ...(active ? {} : { sessionVersion: { increment: 1 } }) },
    });
  },
};
