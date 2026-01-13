// 기존 DB 데이터를 새 DB로 복사하는 스크립트
// 사용법: 
//   1. 기존 DB URL을 SOURCE_DATABASE_URL에 설정
//   2. 새 DB URL을 TARGET_DATABASE_URL에 설정
//   3. tsx scripts/copy-db-data.ts 실행

// .env.local 파일을 명시적으로 로드
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL) {
  console.error("❌ SOURCE_DATABASE_URL 또는 DATABASE_URL이 설정되지 않았습니다.");
  process.exit(1);
}

if (!TARGET_DATABASE_URL) {
  console.error("❌ TARGET_DATABASE_URL이 설정되지 않았습니다.");
  console.error("💡 .env.local에 TARGET_DATABASE_URL을 추가하세요.");
  process.exit(1);
}

// 소스 DB (기존 DB)
const sourcePrisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: SOURCE_DATABASE_URL,
  }),
});

// 타겟 DB (새 DB)
const targetPrisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: TARGET_DATABASE_URL,
  }),
});

async function copyTableData<T>(
  tableName: string,
  sourceData: T[],
  insertFn: (data: T[]) => Promise<any>
) {
  if (sourceData.length === 0) {
    console.log(`  ⏭️  ${tableName}: 데이터 없음`);
    return;
  }

  try {
    await insertFn(sourceData);
    console.log(`  ✅ ${tableName}: ${sourceData.length}개 복사 완료`);
  } catch (error: any) {
    console.error(`  ❌ ${tableName}: 복사 실패 - ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("🚀 데이터베이스 복사 시작...\n");
  console.log(`📥 소스 DB: ${SOURCE_DATABASE_URL.substring(0, 50)}...`);
  console.log(`📤 타겟 DB: ${TARGET_DATABASE_URL.substring(0, 50)}...\n`);

  try {
    // 1. Admin 데이터 복사
    console.log("📋 Admin 데이터 복사 중...");
    const admins = await sourcePrisma.admin.findMany();
    if (admins.length > 0) {
      await targetPrisma.admin.createMany({
        data: admins.map(admin => ({
          id: admin.id,
          username: admin.username,
          passwordHash: admin.passwordHash,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ Admin: ${admins.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  Admin: 데이터 없음");
    }

    // 2. AdminSession 데이터 복사
    console.log("📋 AdminSession 데이터 복사 중...");
    const adminSessions = await sourcePrisma.adminSession.findMany();
    if (adminSessions.length > 0) {
      await targetPrisma.adminSession.createMany({
        data: adminSessions.map(session => ({
          id: session.id,
          adminId: session.adminId,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ AdminSession: ${adminSessions.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  AdminSession: 데이터 없음");
    }

    // 3. Member 데이터 복사
    console.log("📋 Member 데이터 복사 중...");
    const members = await sourcePrisma.member.findMany();
    if (members.length > 0) {
      await targetPrisma.member.createMany({
        data: members.map(member => ({
          id: member.id,
          name: member.name,
          birthDate: member.birthDate,
          phone: member.phone,
          photoUrl: member.photoUrl,
          isActive: member.isActive,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ Member: ${members.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  Member: 데이터 없음");
    }

    // 4. Attendance 데이터 복사
    console.log("📋 Attendance 데이터 복사 중...");
    const attendances = await sourcePrisma.attendance.findMany();
    if (attendances.length > 0) {
      await targetPrisma.attendance.createMany({
        data: attendances.map(attendance => ({
          id: attendance.id,
          memberId: attendance.memberId,
          date: attendance.date,
          status: attendance.status,
          points: attendance.points,
          createdAt: attendance.createdAt,
          updatedAt: attendance.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ Attendance: ${attendances.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  Attendance: 데이터 없음");
    }

    // 5. BonusPoints 데이터 복사
    console.log("📋 BonusPoints 데이터 복사 중...");
    const bonusPoints = await sourcePrisma.bonusPoints.findMany();
    if (bonusPoints.length > 0) {
      await targetPrisma.bonusPoints.createMany({
        data: bonusPoints.map(bp => ({
          id: bp.id,
          memberId: bp.memberId,
          points: bp.points,
          reason: bp.reason,
          createdAt: bp.createdAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ BonusPoints: ${bonusPoints.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  BonusPoints: 데이터 없음");
    }

    // 6. LiarGame 데이터 복사
    console.log("📋 LiarGame 데이터 복사 중...");
    const liarGames = await sourcePrisma.liarGame.findMany();
    if (liarGames.length > 0) {
      await targetPrisma.liarGame.createMany({
        data: liarGames.map(game => ({
          id: game.id,
          name: game.name,
          version: game.version,
          stateJson: game.stateJson,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ LiarGame: ${liarGames.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  LiarPlayer: 데이터 없음");
    }

    // 7. LiarPlayer 데이터 복사
    console.log("📋 LiarPlayer 데이터 복사 중...");
    const liarPlayers = await sourcePrisma.liarPlayer.findMany();
    if (liarPlayers.length > 0) {
      await targetPrisma.liarPlayer.createMany({
        data: liarPlayers.map(player => ({
          id: player.id,
          gameId: player.gameId,
          nickname: player.nickname,
          score: player.score,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ LiarPlayer: ${liarPlayers.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  LiarPlayer: 데이터 없음");
    }

    // 8. WatermelonPlayer 데이터 복사
    console.log("📋 WatermelonPlayer 데이터 복사 중...");
    const watermelonPlayers = await sourcePrisma.watermelonPlayer.findMany();
    if (watermelonPlayers.length > 0) {
      await targetPrisma.watermelonPlayer.createMany({
        data: watermelonPlayers.map(player => ({
          id: player.id,
          nickname: player.nickname,
          passwordHash: player.passwordHash,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonPlayer: ${watermelonPlayers.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonPlayer: 데이터 없음");
    }

    // 9. WatermelonScore 데이터 복사
    console.log("📋 WatermelonScore 데이터 복사 중...");
    const watermelonScores = await sourcePrisma.watermelonScore.findMany();
    if (watermelonScores.length > 0) {
      await targetPrisma.watermelonScore.createMany({
        data: watermelonScores.map(score => ({
          id: score.id,
          playerId: score.playerId,
          score: score.score,
          maxTier: score.maxTier,
          createdAt: score.createdAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonScore: ${watermelonScores.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonScore: 데이터 없음");
    }

    // 10. WatermelonItem 데이터 복사
    console.log("📋 WatermelonItem 데이터 복사 중...");
    const watermelonItems = await sourcePrisma.watermelonItem.findMany();
    if (watermelonItems.length > 0) {
      await targetPrisma.watermelonItem.createMany({
        data: watermelonItems.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          effectType: item.effectType,
          effectValue: item.effectValue,
          icon: item.icon,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonItem: ${watermelonItems.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonItem: 데이터 없음");
    }

    // 11. WatermelonPlayerItem 데이터 복사
    console.log("📋 WatermelonPlayerItem 데이터 복사 중...");
    const watermelonPlayerItems = await sourcePrisma.watermelonPlayerItem.findMany();
    if (watermelonPlayerItems.length > 0) {
      await targetPrisma.watermelonPlayerItem.createMany({
        data: watermelonPlayerItems.map(item => ({
          id: item.id,
          playerId: item.playerId,
          itemId: item.itemId,
          quantity: item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonPlayerItem: ${watermelonPlayerItems.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonPlayerItem: 데이터 없음");
    }

    // 12. WatermelonPayment 데이터 복사
    console.log("📋 WatermelonPayment 데이터 복사 중...");
    const watermelonPayments = await sourcePrisma.watermelonPayment.findMany();
    if (watermelonPayments.length > 0) {
      await targetPrisma.watermelonPayment.createMany({
        data: watermelonPayments.map(payment => ({
          id: payment.id,
          playerId: payment.playerId,
          itemId: payment.itemId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentKey: payment.paymentKey,
          orderId: payment.orderId,
          status: payment.status,
          metadata: payment.metadata,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonPayment: ${watermelonPayments.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonPayment: 데이터 없음");
    }

    // 13. WatermelonItemPurchase 데이터 복사
    console.log("📋 WatermelonItemPurchase 데이터 복사 중...");
    const watermelonItemPurchases = await sourcePrisma.watermelonItemPurchase.findMany();
    if (watermelonItemPurchases.length > 0) {
      await targetPrisma.watermelonItemPurchase.createMany({
        data: watermelonItemPurchases.map(purchase => ({
          id: purchase.id,
          playerId: purchase.playerId,
          itemId: purchase.itemId,
          quantity: purchase.quantity,
          paymentId: purchase.paymentId,
          createdAt: purchase.createdAt,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ WatermelonItemPurchase: ${watermelonItemPurchases.length}개 복사 완료`);
    } else {
      console.log("  ⏭️  WatermelonItemPurchase: 데이터 없음");
    }

    console.log("\n✅ 모든 데이터 복사 완료!");
  } catch (error) {
    console.error("\n❌ 데이터 복사 중 오류 발생:", error);
    throw error;
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("\n🎉 성공적으로 완료되었습니다!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 오류:", error);
    process.exit(1);
  });
