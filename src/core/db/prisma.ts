import { PrismaClient } from "@prisma/client";

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Defaulting to a local database here meant a deploy with the variable
    // missing came up looking healthy and failed on every query instead —
    // which the booking action then reported to guests as success. A missing
    // database URL is a deployment fault and has to stop the process.
    throw new Error(
      "DATABASE_URL is not set. The application cannot start without it. " +
        "Set it in the hosting platform's environment variables — a local " +
        ".env file is not deployed.",
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
