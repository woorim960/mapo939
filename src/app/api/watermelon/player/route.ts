// 수박게임 플레이어 생성/조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!nickname) {
      return NextResponse.json({ error: "nickname_required" }, { status: 400 });
    }

    if (nickname.length > 20) {
      return NextResponse.json({ error: "nickname_too_long" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "password_required" }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    }

    // 기존 플레이어 확인
    const existingPlayer = await prisma.watermelonPlayer.findUnique({
      where: { nickname },
    });

    if (existingPlayer) {
      // 기존 플레이어가 있으면 패스워드 확인
      if (!existingPlayer.passwordHash) {
        // 기존 플레이어에 패스워드가 없으면 (마이그레이션 이전 데이터)
        // 패스워드를 설정할 수 없으므로 에러 반환
        return NextResponse.json({ error: "invalid_password" }, { status: 401 });
      }

      const passwordMatch = await bcrypt.compare(password, existingPlayer.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json({ error: "invalid_password" }, { status: 401 });
      }

      // 패스워드가 일치하면 기존 플레이어 정보 반환
      const player = await prisma.watermelonPlayer.findUnique({
        where: { id: existingPlayer.id },
        include: {
          scores: {
            orderBy: { score: "desc" },
            take: 1,
          },
          _count: {
            select: { scores: true },
          },
        },
      });

      if (!player) {
        return NextResponse.json({ error: "player_not_found" }, { status: 404 });
      }

      // 통계 계산
      const bestScore = player.scores[0]?.score ?? 0;
      const playCount = player._count.scores;

      const allScores = await prisma.watermelonScore.findMany({
        where: { playerId: player.id },
        select: { score: true, maxTier: true },
      });

      const averageScore =
        allScores.length > 0
          ? Math.round(allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length)
          : 0;

      // 최대 과일 레벨 평균 계산
      const maxTiers = allScores
        .map((s) => s.maxTier)
        .filter((tier): tier is number => tier !== null && tier !== undefined);
      const averageMaxTier =
        maxTiers.length > 0
          ? Math.round((maxTiers.reduce((sum, t) => sum + t, 0) / maxTiers.length) * 10) / 10
          : null;

      const playerData: any = {
        id: player.id,
        nickname: player.nickname,
        bestScore,
        averageScore,
        playCount,
      };

      if (averageMaxTier !== null) {
        playerData.averageMaxTier = averageMaxTier;
      }

      return NextResponse.json({
        player: playerData,
      });
    }

    // 기존 플레이어가 없으면 새로 생성 (자동 회원가입)
    const passwordHash = await bcrypt.hash(password, 10);
    const player = await prisma.watermelonPlayer.create({
      data: {
        nickname,
        passwordHash,
      },
      include: {
        scores: {
          orderBy: { score: "desc" },
          take: 1,
        },
        _count: {
          select: { scores: true },
        },
      },
    });

    // 통계 계산
    const bestScore = player.scores[0]?.score ?? 0;
    const playCount = player._count.scores;

    const allScores = await prisma.watermelonScore.findMany({
      where: { playerId: player.id },
      select: { score: true, maxTier: true },
    });

    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length)
        : 0;

    // 최대 과일 레벨 평균 계산
    const maxTiers = allScores
      .map((s) => s.maxTier)
      .filter((tier): tier is number => tier !== null && tier !== undefined);
    const averageMaxTier =
      maxTiers.length > 0
        ? Math.round((maxTiers.reduce((sum, t) => sum + t, 0) / maxTiers.length) * 10) / 10
        : null;

    const playerData: any = {
      id: player.id,
      nickname: player.nickname,
      bestScore,
      playCount,
      averageScore,
    };

    if (averageMaxTier !== null) {
      playerData.averageMaxTier = averageMaxTier;
    }

    return NextResponse.json({
      player: playerData,
    });
  } catch (error: any) {
    console.error("Watermelon player API error:", error);
    if (error.code === "P2002") {
      // Unique constraint violation - shouldn't happen with upsert, but just in case
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
