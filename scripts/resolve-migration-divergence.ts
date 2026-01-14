// 마이그레이션 불일치 해결 스크립트
// 데이터베이스의 마이그레이션 기록을 로컬 마이그레이션 이름으로 업데이트

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔧 마이그레이션 불일치 해결 시작...");

  // 데이터베이스의 마이그레이션 기록 확인
  const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations 
    WHERE migration_name = '20260114103000_add_attendance_points_usage'
  `;

  if (migrations.length > 0) {
    console.log("📝 데이터베이스의 마이그레이션 이름을 로컬 이름으로 업데이트...");
    
    // 마이그레이션 이름 업데이트
    await prisma.$executeRaw`
      UPDATE _prisma_migrations 
      SET migration_name = '20260114103408_add_attendance_points_usage'
      WHERE migration_name = '20260114103000_add_attendance_points_usage'
    `;

    console.log("✅ 마이그레이션 이름 업데이트 완료!");
  } else {
    console.log("ℹ️ 해당 마이그레이션을 찾을 수 없습니다.");
  }

  // 현재 마이그레이션 상태 확인
  const allMigrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
    SELECT migration_name, finished_at 
    FROM _prisma_migrations 
    ORDER BY finished_at DESC
    LIMIT 5
  `;

  console.log("\n📋 최근 마이그레이션 기록:");
  allMigrations.forEach((m) => {
    console.log(`  - ${m.migration_name} (${m.finished_at ? "완료" : "진행 중"})`);
  });
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
