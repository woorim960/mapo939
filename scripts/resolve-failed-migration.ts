// 실패한 마이그레이션 해결 스크립트
// 실패한 마이그레이션을 롤백하고 다시 적용하거나, 실패 상태를 해결합니다.

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// .env.local 파일을 명시적으로 로드
config({ path: ".env.local" });

// 환경 변수에서 DB URL 가져오기
// 명령줄 인자로 DB 타입을 받을 수 있음 (prod 또는 dev)
const dbType = process.argv[2] || "dev";
const databaseUrl = dbType === "prod" 
  ? process.env.PROD_DATABASE_URL 
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(`❌ ${dbType === "prod" ? "PROD_DATABASE_URL" : "DATABASE_URL"}이 설정되지 않았습니다.`);
  console.error(`💡 .env.local에 ${dbType === "prod" ? "PROD_DATABASE_URL" : "DATABASE_URL"}을 추가하세요.`);
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbTypeLabel = dbType === "prod" ? "운영" : "개발";
  
  console.log(`🔧 ${dbTypeLabel} DB의 실패한 마이그레이션 해결 시작...`);
  console.log(`📊 DB URL: ${databaseUrl.substring(0, 50)}...\n`);

  try {
    // 실패한 마이그레이션 확인
    const result = await prisma.$queryRaw<Array<{ migration_name: string; started_at: Date; finished_at: Date | null }>>`
      SELECT migration_name, started_at, finished_at 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NULL 
      ORDER BY started_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) {
      console.log("✅ 실패한 마이그레이션이 없습니다.");
      return;
    }

    const failedMigration = result[0];
    console.log(`⚠️  실패한 마이그레이션 발견: ${failedMigration.migration_name}`);
    console.log(`   시작 시간: ${failedMigration.started_at}`);
    console.log(`\n실패한 마이그레이션을 롤백합니다...\n`);

    // 실패한 마이그레이션 레코드 삭제 (롤백)
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = ${failedMigration.migration_name} 
      AND finished_at IS NULL
    `;

    console.log(`✅ 실패한 마이그레이션 레코드를 삭제했습니다.`);
    console.log(`\n💡 이제 다음 명령어로 마이그레이션을 다시 적용할 수 있습니다:`);
    console.log(`   npm run db:migrate`);
    console.log(`\n또는 Vercel에서 자동으로 재배포하면 마이그레이션이 다시 적용됩니다.`);
  } catch (error: any) {
    console.error("❌ 실패한 마이그레이션 해결 중 오류:", error);
    console.error("\n수동으로 해결하려면:");
    console.error("1. 데이터베이스에 직접 접속");
    console.error("2. _prisma_migrations 테이블에서 finished_at이 NULL인 레코드 확인");
    console.error("3. 해당 레코드를 삭제하거나 수정");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ 스크립트 실행 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
