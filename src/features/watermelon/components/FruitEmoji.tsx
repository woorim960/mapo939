// 과일 이모지 컴포넌트 (수박 반쪽 자동 처리)

import { FRUIT_CONFIGS } from "../utils/config";
import type { FruitTier } from "../types";

type FruitEmojiProps = {
  tier: FruitTier;
  className?: string;
  style?: React.CSSProperties;
};

export function FruitEmoji({ tier, className = "", style = {} }: FruitEmojiProps) {
  const config = FRUIT_CONFIGS[tier];
  const isHalfWatermelon = tier === 9;

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        ...style,
        ...(isHalfWatermelon && {
          clipPath: 'inset(0 50% 0 0)',
          overflow: 'hidden',
        }),
      }}
    >
      {config.emoji}
    </span>
  );
}
