// 답변 공개 카드 컴포넌트

import { useEffect, useState } from "react";
import type { PublicPlayer } from "../types";

type RevealCardProps = {
  players: PublicPlayer[];
  answers: Record<string, number>;
};

export function RevealCard({ players, answers }: RevealCardProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRevealed(new Set());
    const alivePlayers = players.filter((p) => p.isAlive);
    alivePlayers.forEach((p, index) => {
      setTimeout(() => {
        setRevealed((prev) => new Set([...prev, p.playerId]));
      }, index * 150);
    });
  }, [players.map((p) => p.playerId).join(","), Object.keys(answers).join(",")]);

  const alivePlayers = players.filter((p) => p.isAlive);
  const sortedPlayers = [...alivePlayers].sort((a, b) => {
    const aAnswer = answers[a.playerId];
    const bAnswer = answers[b.playerId];
    if (aAnswer === undefined) return 1;
    if (bAnswer === undefined) return -1;
    return aAnswer - bAnswer;
  });

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
        <span>🎴</span>
        <span>답변 공개</span>
      </div>
      <div className="space-y-2.5">
        {sortedPlayers.map((p, index) => {
            const answer = answers[p.playerId];
            const isRevealed = revealed.has(p.playerId);

            return (
              <div
                key={p.playerId}
                className={[
                  "flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all duration-300",
                  isRevealed
                    ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-md animate-in slide-in-from-left-2"
                    : "bg-gray-100 border-gray-200 opacity-50",
                ].join(" ")}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-base text-gray-800">{p.nickname}</div>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {isRevealed ? (answer !== undefined ? answer : "❌") : "🔒"}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
