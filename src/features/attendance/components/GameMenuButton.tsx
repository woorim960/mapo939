"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type GameItem = {
  id: string;
  name: string;
  emoji: string;
  path: string;
};

const games: GameItem[] = [
  {
    id: "liar",
    name: "라이어 게임",
    emoji: "🎭",
    path: "/liar",
  },
  // 향후 게임 추가 시 여기에 추가
];

export function GameMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
      {/* 게임 메뉴 아이템들 */}
      <div
        className={`absolute bottom-20 right-0 flex flex-col-reverse gap-3 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {games.map((game, index) => (
          <Link
            key={game.id}
            href={game.path}
            className={`
              flex items-center gap-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-sm 
              px-4 py-3 shadow-xl hover:shadow-2xl hover:scale-[1.05] active:scale-[0.98] 
              transition-all duration-200 whitespace-nowrap
              bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold
            `}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : `${(games.length - 1 - index) * 50}ms`,
            }}
            onClick={() => setIsOpen(false)}
          >
            <span className="text-2xl">{game.emoji}</span>
            <span className="text-sm md:text-base">{game.name}</span>
          </Link>
        ))}
      </div>

      {/* 메인 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-orange-500 to-red-500 
          shadow-2xl hover:shadow-2xl hover:scale-110 active:scale-95 
          transition-all duration-300 flex items-center justify-center
          ${isOpen ? "rotate-45" : "rotate-0"}
        `}
        aria-label={isOpen ? "게임 메뉴 닫기" : "게임 메뉴 열기"}
      >
        <span className="text-3xl md:text-4xl transition-transform duration-300">
          {isOpen ? "✕" : "🎮"}
        </span>
      </button>
    </div>
  );
}
