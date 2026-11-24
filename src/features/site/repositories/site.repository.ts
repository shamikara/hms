import { Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";

/**
 * Property-level settings rows. Each key holds one JSON value; the service
 * validates on the way in and out, so a hand-edited row cannot reach a page
 * in a shape it does not expect.
 */
export const SiteRepository = {
  async defaultPropertyId(): Promise<string | null> {
    const property = await prisma.property.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return property?.id ?? null;
  },

  async readSettings(propertyId: string, keys: string[]) {
    const rows = await prisma.setting.findMany({
      where: { propertyId, key: { in: keys } },
      select: { key: true, value: true },
    });
    return new Map(rows.map((r) => [r.key, r.value]));
  },

  async writeSetting(propertyId: string, key: string, value: Prisma.InputJsonValue) {
    await prisma.setting.upsert({
      where: { propertyId_key: { propertyId, key } },
      update: { value },
      create: { level: "PROPERTY", propertyId, key, value },
    });
  },

  async deleteSetting(propertyId: string, key: string) {
    await prisma.setting.deleteMany({ where: { propertyId, key } });
  },
};
