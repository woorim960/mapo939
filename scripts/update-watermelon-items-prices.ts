// 수박게임 아이템 가격 업데이트 스크립트
// 운영 DB와 개발 DB 모두 업데이트 가능

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// .env.local 파일을 명시적으로 로드
config({ path: ".env.local" });

// 환경 변수에서 DB URL 가져오기 (운영 DB는 PROD_DATABASE_URL, 개발 DB는 DATABASE_URL)
const databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL 또는 PROD_DATABASE_URL이 설정되지 않았습니다.");
  console.error("💡 운영 DB를 업데이트하려면 .env.local에 PROD_DATABASE_URL을 추가하세요.");
  console.error("💡 예: PROD_DATABASE_URL=postgresql://...");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// 가격 매핑 (10배 낮춘 가격)
const priceMap: Record<string, number> = {
  "추가 생명": 100,
  "중력 감소": 50,
  "점수 2배": 80,
  "하단 과일 제거": 120,
  "랜덤 과일 제거": 150,
  "게임 오버 라인 하향": 200,
};

async function main() {
  const isProd = !!process.env.PROD_DATABASE_URL;
  const dbType = isProd ? "운영" : "개발";
  
  console.log(`🌱 ${dbType} DB의 수박게임 아이템 가격 업데이트 시작...`);
  console.log(`📊 DB URL: ${databaseUrl.substring(0, 50)}...\n`);

  // 기존 아이템 가격 업데이트
  const existingItems = await prisma.watermelonItem.findMany();
  
  if (existingItems.length === 0) {
    console.log("⚠️  아이템이 없습니다. 시드 스크립트를 먼저 실행하세요.");
    return;
  }

  console.log(`📝 기존 ${existingItems.length}개의 아이템 가격을 업데이트합니다...\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of existingItems) {
    const newPrice = priceMap[item.name];
    
    if (newPrice === undefined) {
      console.log(`⚠️  알 수 없는 아이템: ${item.name} (스킵)`);
      skippedCount++;
      continue;
    }

    if (item.price === newPrice) {
      console.log(`⏭️  ${item.name}: 이미 가격이 ${newPrice}입니다. (스킵)`);
      skippedCount++;
      continue;
    }

    await prisma.watermelonItem.update({
      where: { id: item.id },
      data: { price: newPrice },
    });
    
    console.log(`✅ ${item.name}: ${item.price} → ${newPrice}`);
    updatedCount++;
  }

  console.log(`\n🎉 완료! 업데이트: ${updatedCount}개, 스킵: ${skippedCount}개`);
}

main()
  .catch((e) => {
    console.error("❌ 업데이트 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
