// 보너스 점수 관련 API 클라이언트

import { apiPost } from "@/shared/api/client";

type AddBonusPointsResponse = {
  bonusPoints: {
    id: string;
    memberId: string;
    points: number;
    reason: string;
    createdAt: string;
  };
};

export async function addBonusPoints(
  memberId: string,
  points: number,
  reason: string
): Promise<AddBonusPointsResponse> {
  return await apiPost<AddBonusPointsResponse>("/api/bonus-points", {
    memberId,
    points,
    reason,
  });
}
