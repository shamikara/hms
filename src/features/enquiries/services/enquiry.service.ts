import { EnquiryStatus } from "@prisma/client";
import prisma from "@/core/db/prisma";
import type { EnquiryValues } from "../validations/enquiry.schema";

export interface EnquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  travelDates: string | null;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
}

export const EnquiryService = {
  async create(propertyId: string, values: Omit<EnquiryValues, "website">) {
    return prisma.enquiry.create({
      data: {
        propertyId,
        name: values.name,
        email: values.email,
        phone: values.phone ?? null,
        subject: values.subject,
        travelDates: values.travelDates ?? null,
        message: values.message,
      },
      select: { id: true, createdAt: true },
    });
  },

  /** Newest first. New messages always shown; older handled ones capped. */
  async list(propertyId: string): Promise<EnquiryRow[]> {
    const rows = await prisma.enquiry.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      subject: r.subject,
      travelDates: r.travelDates,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  /** Scoped to the property so an id from elsewhere changes nothing. */
  async setStatus(propertyId: string, id: string, status: EnquiryStatus) {
    const result = await prisma.enquiry.updateMany({ where: { id, propertyId }, data: { status } });
    return result.count > 0;
  },

  async remove(propertyId: string, id: string) {
    const result = await prisma.enquiry.deleteMany({ where: { id, propertyId } });
    return result.count > 0;
  },

  async countNew(propertyId: string) {
    return prisma.enquiry.count({ where: { propertyId, status: "NEW" } });
  },
};
