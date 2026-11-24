import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { StaffRepository, type StaffRow } from "../repositories/staff.repository";
import type { CreateStaffValues, UpdateStaffValues } from "../validations/staff.schema";

/** A refusal the admin should read, as opposed to a fault. */
export class StaffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffError";
  }
}

/** Who is making the change; from the admin session. */
export interface StaffActor {
  userId: string;
  roles: string[];
}

export interface StaffMember {
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  active: boolean;
  roles: string[];
  isSelf: boolean;
  createdAt: string;
}

const SUPER_ADMIN = "SUPER_ADMIN";
const BCRYPT_ROUNDS = 10;

function rolesAt(row: StaffRow, propertyId: string): string[] {
  const assignment = row.assignments.find((a) => a.propertyId === propertyId);
  return assignment ? assignment.roles.map((r) => r.role.name).sort() : [];
}

function toMember(row: StaffRow, propertyId: string, actor: StaffActor): StaffMember {
  return {
    employeeId: row.id,
    userId: row.user.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.user.email,
    employeeNumber: row.employeeId,
    active: row.user.isActive,
    roles: rolesAt(row, propertyId),
    isSelf: row.user.id === actor.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Super-admin accounts can only be created, changed or switched off by a super
 * admin. Without this a manager could make themselves one, or lock one out.
 */
function assertMayTouchSuperAdmin(actor: StaffActor, involvesSuperAdmin: boolean) {
  if (involvesSuperAdmin && !actor.roles.includes(SUPER_ADMIN)) {
    throw new StaffError("Only a super admin can manage super-admin accounts.");
  }
}

async function load(employeeId: string, propertyId: string, db: Prisma.TransactionClient) {
  const row = await StaffRepository.findForProperty(employeeId, propertyId, db);
  if (!row) throw new StaffError("That staff member was not found.");
  return row;
}

export const StaffService = {
  async list(propertyId: string, actor: StaffActor): Promise<StaffMember[]> {
    const rows = await StaffRepository.listForProperty(propertyId);
    return rows.map((row) => toMember(row, propertyId, actor));
  },

  async create(propertyId: string, actor: StaffActor, input: CreateStaffValues) {
    assertMayTouchSuperAdmin(actor, input.roles.includes(SUPER_ADMIN));

    const existing = await StaffRepository.findUserByEmail(input.email);
    if (existing) {
      // Taking over a guest's sign-in would reset their password from under
      // them, and silently granting it staff access is worse.
      throw new StaffError(
        existing.employee
          ? "Someone on the staff already uses that email."
          : "That email already has a guest sign-in. Use a different email for the staff account.",
      );
    }

    const organizationId = await StaffRepository.propertyOrganization(propertyId);
    if (!organizationId) throw new StaffError("No property is configured yet.");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    // Random rather than sequential: unique per organisation without a
    // counter to race on, and not guessable from the previous one.
    const employeeNumber = `STF-${randomBytes(4).toString("hex").toUpperCase()}`;

    try {
      return await prisma.$transaction(async (tx) => {
        const roles = await StaffRepository.ensureRoles(input.roles, tx);
        return StaffRepository.createStaff(
          {
            organizationId,
            propertyId,
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            employeeNumber,
            roleIds: roles.map((r) => r.id),
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new StaffError("Someone already uses that email.");
      }
      throw error;
    }
  },

  async update(propertyId: string, actor: StaffActor, input: UpdateStaffValues) {
    await prisma.$transaction(
      async (tx) => {
        const row = await load(input.employeeId, propertyId, tx);
        const current = rolesAt(row, propertyId);
        const assignment = row.assignments.find((a) => a.propertyId === propertyId)!;

        assertMayTouchSuperAdmin(actor, current.includes(SUPER_ADMIN) || input.roles.includes(SUPER_ADMIN));

        const rolesChanged =
          current.length !== input.roles.length || current.some((r) => !(input.roles as string[]).includes(r));
        if (rolesChanged && row.user.id === actor.userId) {
          throw new StaffError("You cannot change your own roles. Ask another manager.");
        }

        if (current.includes(SUPER_ADMIN) && !input.roles.includes(SUPER_ADMIN)) {
          const count = await StaffRepository.countActiveWithRole(propertyId, SUPER_ADMIN, tx);
          if (count <= 1) throw new StaffError("This is the last super admin. Make someone else one first.");
        }

        const roles = await StaffRepository.ensureRoles(input.roles, tx);
        await StaffRepository.updateStaff(
          {
            employeeId: row.id,
            assignmentId: assignment.id,
            firstName: input.firstName,
            lastName: input.lastName,
            roleIds: roles.map((r) => r.id),
          },
          tx,
        );
      },
      { isolationLevel: "Serializable" },
    );
  },

  async resetPassword(propertyId: string, actor: StaffActor, employeeId: string, password: string) {
    const row = await StaffRepository.findForProperty(employeeId, propertyId);
    if (!row) throw new StaffError("That staff member was not found.");
    assertMayTouchSuperAdmin(actor, rolesAt(row, propertyId).includes(SUPER_ADMIN));

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await StaffRepository.setPassword(row.user.id, passwordHash);
  },

  async setActive(propertyId: string, actor: StaffActor, employeeId: string, active: boolean) {
    await prisma.$transaction(
      async (tx) => {
        const row = await load(employeeId, propertyId, tx);
        const roles = rolesAt(row, propertyId);
        assertMayTouchSuperAdmin(actor, roles.includes(SUPER_ADMIN));

        if (!active && row.user.id === actor.userId) {
          throw new StaffError("You cannot switch off your own sign-in.");
        }
        if (!active && roles.includes(SUPER_ADMIN)) {
          const count = await StaffRepository.countActiveWithRole(propertyId, SUPER_ADMIN, tx);
          if (count <= 1) throw new StaffError("This is the last super admin and cannot be switched off.");
        }
        await StaffRepository.setActive(row.user.id, active, tx);
      },
      { isolationLevel: "Serializable" },
    );
  },
};
