// 수박게임 아이템 시드 데이터

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// .env.local 파일을 명시적으로 로드
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 수박게임 아이템 데이터 시드 시작...");

  // 가격 매핑 (이름으로 매칭하여 가격 업데이트)
  const priceMap: Record<string, number> = {
    "중력 감소": 50,
    "점수 2배": 80,
    "하단 과일 제거": 120,
    "랜덤 과일 제거": 150,
    "게임 오버 라인 하향": 200, // 기존 이름 (하위 호환성)
    "게임 오버 라인 상향": 200, // 새 이름
    "다음 과일 지정": 0, // 동적 가격 (레벨 x 10)
  };

  // 기존 아이템 가격 업데이트
  const existingItems = await prisma.watermelonItem.findMany();
  if (existingItems.length > 0) {
    console.log(`📝 기존 ${existingItems.length}개의 아이템 가격을 업데이트합니다...`);
    for (const item of existingItems) {
      const newPrice = priceMap[item.name];
      if (newPrice !== undefined && item.price !== newPrice) {
        await prisma.watermelonItem.update({
          where: { id: item.id },
          data: { price: newPrice },
        });
        console.log(`✅ ${item.name}: ${item.price} → ${newPrice}`);
      }
    }
  }

  const items = [
    {
      name: "다음 과일 지정",
      description: "원하는 과일을 선택하여 다음에 떨어지도록 지정합니다. 가격은 선택한 과일의 레벨 x 10입니다.",
      price: 0, // 동적 가격 (레벨 x 10)
      effectType: "select_next_fruit",
      effectValue: null, // 사용 시 선택
      icon: "🎯",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "중력 감소",
      description: "과일이 천천히 떨어집니다 (30초)",
      price: 50,
      effectType: "slow_gravity",
      effectValue: { duration: 30000, gravityMultiplier: 0.5 },
      icon: "⬇️",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "점수 2배",
      description: "30초 동안 획득하는 점수가 2배가 됩니다",
      price: 80,
      effectType: "bonus_score",
      effectValue: { duration: 30000, multiplier: 2 },
      icon: "⭐",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "하단 과일 제거",
      description: "화면 하단의 과일 3개를 제거합니다",
      price: 120,
      effectType: "remove_fruits",
      effectValue: { count: 3, position: "bottom" },
      icon: "🧹",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "랜덤 과일 제거",
      description: "화면의 랜덤 과일 5개를 제거합니다",
      price: 150,
      effectType: "remove_fruits",
      effectValue: { count: 5, position: "random" },
      icon: "✨",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "게임 오버 라인 상향",
      description: "게임 오버 라인을 최고 위로 올립니다. 게임당 한 번만 사용 가능하며, 게임 종료까지 효과가 유지됩니다.",
      price: 200,
      effectType: "lower_game_over_line",
      effectValue: { duration: 60000, offset: 50 }, // duration과 offset은 사용되지 않음 (영구 효과)
      icon: "📉",
      sortOrder: 6,
      isActive: true,
    },
  ];

  // 아이템 upsert (있으면 업데이트, 없으면 생성)
  let createdCount = 0;
  let updatedCount = 0;
  
  // extra_life 아이템 삭제
  await prisma.watermelonItem.deleteMany({
    where: { effectType: "extra_life" },
  });
  console.log("🗑️ 추가 생명 아이템 삭제 완료");

  for (const item of items) {
    // 기존 이름("게임 오버 라인 하향")도 찾아서 업데이트
    const existing = await prisma.watermelonItem.findFirst({
      where: {
        OR: [
          { name: item.name },
          { name: "게임 오버 라인 하향", effectType: "lower_game_over_line" }, // 기존 이름으로도 찾기
        ],
      },
    });

    if (existing) {
      await prisma.watermelonItem.update({
        where: { id: existing.id },
        data: {
          name: item.name, // 이름도 업데이트
          price: item.price,
          description: item.description,
          effectType: item.effectType,
          effectValue: item.effectValue,
          icon: item.icon,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        },
      });
      updatedCount++;
      console.log(`✅ 아이템 업데이트: ${item.icon} ${item.name} (가격: ${item.price})`);
    } else {
      await prisma.watermelonItem.create({
        data: item,
      });
      createdCount++;
      console.log(`✅ 아이템 생성: ${item.icon} ${item.name} (가격: ${item.price})`);
    }
  }

  console.log(`🎉 완료! 생성: ${createdCount}개, 업데이트: ${updatedCount}개`);
}

main()
  .catch((e) => {
    console.error("❌ 시드 실행 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
