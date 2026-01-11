// 다음 과일 미리보기 컴포넌트

import type { FruitTier } from "../types";
import { FRUIT_CONFIGS } from "../utils/config";

type NextFruitProps = {
  fruitLevel: FruitTier;
};

export function NextFruit({ fruitLevel }: NextFruitProps) {
  const config = FRUIT_CONFIGS[fruitLevel];

  return (
    <div className="flex items-center gap-2 rounded-lg bg-blue-50/50 px-2.5 py-1.5 border border-blue-200/50">
      <div className="text-[10px] text-blue-700 font-medium">다음</div>
      <div
        className="flex items-center justify-center"
        style={{
          fontSize: `${Math.min(config.radius * 0.8, 20)}px`,
        }}
      >
        {config.emoji}
      </div>
    </div>
  );
}
