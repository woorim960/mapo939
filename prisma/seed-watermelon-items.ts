// 수박게임 아이템 시드 데이터

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 수박게임 아이템 데이터 시드 시작...");

  // 기존 아이템이 있으면 스킵
  const existingItems = await prisma.watermelonItem.count();
  if (existingItems > 0) {
    console.log(`✅ 이미 ${existingItems}개의 아이템이 존재합니다. 스킵합니다.`);
    return;
  }

  const items = [
    {
      name: "추가 생명",
      description: "게임 오버 시 한 번 더 기회를 줍니다",
      price: 1000,
      effectType: "extra_life",
      effectValue: { count: 1 },
      icon: "💚",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "중력 감소",
      description: "과일이 천천히 떨어집니다 (30초)",
      price: 500,
      effectType: "slow_gravity",
      effectValue: { duration: 30000, gravityMultiplier: 0.5 },
      icon: "⬇️",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "점수 2배",
      description: "30초 동안 획득하는 점수가 2배가 됩니다",
      price: 800,
      effectType: "bonus_score",
      effectValue: { duration: 30000, multiplier: 2 },
      icon: "⭐",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "하단 과일 제거",
      description: "화면 하단의 과일 3개를 제거합니다",
      price: 1200,
      effectType: "remove_fruits",
      effectValue: { count: 3, position: "bottom" },
      icon: "🧹",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "랜덤 과일 제거",
      description: "화면의 랜덤 과일 5개를 제거합니다",
      price: 1500,
      effectType: "remove_fruits",
      effectValue: { count: 5, position: "random" },
      icon: "✨",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "게임 오버 라인 하향",
      description: "게임 오버 라인을 일시적으로 낮춥니다 (60초)",
      price: 2000,
      effectType: "lower_game_over_line",
      effectValue: { duration: 60000, offset: 50 },
      icon: "📉",
      sortOrder: 6,
      isActive: true,
    },
  ];

  for (const item of items) {
    await prisma.watermelonItem.create({
      data: item,
    });
    console.log(`✅ 아이템 생성: ${item.icon} ${item.name}`);
  }

  console.log(`🎉 총 ${items.length}개의 아이템이 생성되었습니다!`);
}

main()
  .catch((e) => {
    console.error("❌ 시드 실행 중 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
