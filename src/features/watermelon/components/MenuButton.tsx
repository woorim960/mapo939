// 메뉴 버튼 컴포넌트 (라이어 게임과 동일한 구조)

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  emoji: string;
  path: string;
};

type MenuButtonProps = {
  items: MenuItem[];
  buttonEmoji?: string;
  buttonGradient?: string;
};

export function MenuButton({
  items,
  buttonEmoji = "🎮",
  buttonGradient = "from-green-500 to-emerald-500",
}: MenuButtonProps) {
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
      {/* 메뉴 아이템들 */}
      <div
        className={`absolute bottom-20 right-0 flex flex-col-reverse gap-3 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={item.path}
            className={`
              flex items-center gap-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-sm 
              px-4 py-3 shadow-xl hover:shadow-2xl hover:scale-[1.05] active:scale-[0.98] 
              transition-all duration-200 whitespace-nowrap
              bg-gradient-to-r ${buttonGradient} text-white font-bold
            `}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : `${(items.length - 1 - index) * 50}ms`,
            }}
            onClick={() => setIsOpen(false)}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-sm md:text-base">{item.name}</span>
          </Link>
        ))}
      </div>

      {/* 메인 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r ${buttonGradient}
          shadow-2xl hover:shadow-2xl hover:scale-110 active:scale-95 
          transition-all duration-300 flex items-center justify-center
          ${isOpen ? "rotate-45" : "rotate-0"}
        `}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        <span className="text-3xl md:text-4xl transition-transform duration-300">
          {isOpen ? "✕" : buttonEmoji}
        </span>
      </button>
    </div>
  );
}
