// 다음 과일 미리보기 컴포넌트

import type { FruitTier } from "../types";
import { FRUIT_CONFIGS } from "../utils/config";
import { forwardRef } from "react";
import { FruitEmoji } from "./FruitEmoji";

type NextFruitProps = {
  fruitLevel: FruitTier;
  hideText?: boolean;
  onClick?: () => void;
};

export const NextFruit = forwardRef<HTMLButtonElement, NextFruitProps>(({ fruitLevel, hideText = false, onClick }, ref) => {
  const config = FRUIT_CONFIGS[fruitLevel];

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg bg-blue-50/50 px-2.5 py-1.5 border border-blue-200/50 whitespace-nowrap hover:bg-blue-100/70 hover:border-blue-300/70 active:scale-95 transition-all duration-200 cursor-pointer"
      aria-label="다음 과일 변경"
    >
      {!hideText && <div className="text-[10px] text-blue-700 font-medium">다음</div>}
      <div
        className="flex items-center justify-center"
        style={{
          fontSize: `${Math.min(config.radius * 0.8, 20)}px`,
        }}
      >
        <FruitEmoji tier={fruitLevel} />
      </div>
    </button>
  );
});

NextFruit.displayName = "NextFruit";
