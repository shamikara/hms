import prisma from "@/core/db/prisma";
import { DriverEmploymentStatus, Prisma } from "@prisma/client";
import type { FleetTx } from "./vehicle.repository";

/**
 * Drivers are a credentials profile on top of `Employee`. Every read therefore
 * joins the employee for the person's name — the fleet module never stores a
 * second copy of it.
 */
export const driverSelect = {
  id: true,
  employeeId: true,
  licenseNumber: true,
  licenseExpiry: true,
  safariExperienceYears: true,
  employmentStatus: true,
  isAvailable: true,
  isActive: true,
  imageUrl: true,
  notes: true,
  ratingCount: true,
  ratingAvg: true,
  ratingBayesian: true,
  ratingSafetyAvg: true,
  ratingPunctualityAvg: true,
  ratingProfessionalismAvg: true,
  ratingCommunicationAvg: true,
  ratingKnowledgeAvg: true,
  ratingsUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      organizationId: true,
      assignments: { select: { propertyId: true } },
    },
  },
} satisfies Prisma.SafariDriverSelect;

export type DriverRow = Prisma.SafariDriverGetPayload<{ select: typeof driverSelect }>;

export interface DriverListFilters {
  /** Restricts to drivers assigned to this property via PropertyAssignment. */
  propertyId?: string;
  employmentStatus?: DriverEmploymentStatus;
  includeArchived?: boolean;
  search?: string;
}

export const DriverRepository = {
  async list(filters: DriverListFilters): Promise<DriverRow[]> {
    const where: Prisma.SafariDriverWhereInput = {
      ...(filters.includeArchived ? {} : { deletedAt: null }),
      ...(filters.employmentStatus ? { employmentStatus: filters.employmentStatus } : {}),
      ...(filters.propertyId
        ? { employee: { assignments: { some: { propertyId: filters.propertyId } } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { licenseNumber: { contains: filters.search, mode: "insensitive" } },
              {
                employee: {
                  OR: [
                    { firstName: { contains: filters.search, mode: "insensitive" } },
                    { lastName: { contains: filters.search, mode: "insensitive" } },
                    { employeeId: { contains: filters.search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    return prisma.safariDriver.findMany({
      where,
      select: driverSelect,
      orderBy: [{ deletedAt: "asc" }, { employee: { firstName: "asc" } }],
    });
  },

  async findById(id: string): Promise<DriverRow | null> {
    return prisma.safariDriver.findUnique({ where: { id }, select: driverSelect });
  },

  async findByEmployeeId(employeeId: string): Promise<DriverRow | null> {
    return prisma.safariDriver.findUnique({ where: { employeeId }, select: driverSelect });
  },

  async create(
    data: Prisma.SafariDriverUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<DriverRow> {
    return (tx ?? prisma).safariDriver.create({ data, select: driverSelect });
  },

  async update(
    id: string,
    data: Prisma.SafariDriverUpdateInput,
    tx?: FleetTx
  ): Promise<DriverRow> {
    return (tx ?? prisma).safariDriver.update({
      where: { id },
      data,
      select: driverSelect,
    });
  },

  async archive(id: string, tx?: FleetTx): Promise<DriverRow> {
    return (tx ?? prisma).safariDriver.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isAvailable: false,
        employmentStatus: DriverEmploymentStatus.TERMINATED,
      },
      select: driverSelect,
    });
  },

  async restore(id: string, tx?: FleetTx): Promise<DriverRow> {
    return (tx ?? prisma).safariDriver.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        isAvailable: true,
        employmentStatus: DriverEmploymentStatus.ACTIVE,
      },
      select: driverSelect,
    });
  },

  /**
   * Employees who are eligible to become drivers: active, and not already
   * holding a driver profile. Used to populate the "add driver" picker so the
   * module never creates a duplicate person record.
   */
  async listEligibleEmployees(propertyId?: string) {
    return prisma.employee.findMany({
      where: {
        deletedAt: null,
        driverProfile: null,
        ...(propertyId ? { assignments: { some: { propertyId } } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },

  /** Employees who can be assigned as a guide on a trip. */
  async listGuideCandidates(propertyId?: string) {
    return prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...(propertyId ? { assignments: { some: { propertyId } } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },
};
