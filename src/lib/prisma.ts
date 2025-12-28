// src/lib/prisma.ts
import { PrismaNeon } from "@prisma/adapter-neon";

// ✅ 일부 환경에서 named export(PrismaClient)가 깨지는 케이스가 있어 default import로 우회
import PrismaPkg from "@prisma/client";

type PrismaClientType = InstanceType<(typeof PrismaPkg)["PrismaClient"]>;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new PrismaPkg.PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
