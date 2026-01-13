// 기존 패스워드 없는 플레이어들에게 기본 패스워드(1234) 설정

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("기존 패스워드 없는 플레이어들을 찾는 중...");

  // passwordHash가 null인 플레이어들 찾기
  const playersWithoutPassword = await prisma.watermelonPlayer.findMany({
    where: {
      passwordHash: null,
    },
  });

  console.log(`패스워드가 없는 플레이어 ${playersWithoutPassword.length}명 발견`);

  if (playersWithoutPassword.length === 0) {
    console.log("업데이트할 플레이어가 없습니다.");
    return;
  }

  // 기본 패스워드 해시 생성
  const defaultPassword = "1234";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 모든 플레이어 업데이트
  let updatedCount = 0;
  for (const player of playersWithoutPassword) {
    await prisma.watermelonPlayer.update({
      where: { id: player.id },
      data: { passwordHash },
    });
    updatedCount++;
    console.log(`플레이어 "${player.nickname}" (${player.id}) 업데이트 완료`);
  }

  console.log(`\n총 ${updatedCount}명의 플레이어가 업데이트되었습니다.`);
  console.log(`기본 패스워드: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error("에러 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
