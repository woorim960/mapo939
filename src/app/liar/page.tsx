"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listRooms, createRoom, type RoomInfo } from "@/features/liar/api";
import { MenuButton } from "@/features/liar/components/MenuButton";
import { Toast } from "@/shared/components/Toast";
import { HowToModal } from "@/features/liar/components/HowToModal";

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    LOBBY: "대기 중",
    PREP: "준비 중",
    ANSWERING: "답변 입력",
    REVEAL: "답변 공개",
    DISCUSS: "토론",
    VOTING: "투표",
    TIE_DISCUSS: "재논의",
    RESULT: "결과",
    GAME_OVER: "게임 종료",
  };
  return map[phase] ?? phase;
}

function LiarRoomsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [nameError, setNameError] = useState<string>("");
  const [showRoomDeletedToast, setShowRoomDeletedToast] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 3000); // 3초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // URL 쿼리 파라미터에서 roomDeleted 확인
  useEffect(() => {
    const roomDeleted = searchParams.get("roomDeleted");
    if (roomDeleted === "true") {
      setShowRoomDeletedToast(true);
      // URL에서 쿼리 파라미터 제거
      router.replace("/liar", { scroll: false });
      // Toast 컴포넌트의 duration prop으로 자동으로 5초 후 사라짐
    }
  }, [searchParams, router]);

  async function loadRooms() {
    try {
      const data = await listRooms();
      setRooms(data);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom() {
    if (creating) return;
    
    // 방 이름 검증
    const trimmedName = roomName.trim();
    if (!trimmedName) {
      setNameError("방 이름을 입력해주세요.");
      return;
    }
    
    setNameError("");
    setCreating(true);
    try {
      const { roomId } = await createRoom(trimmedName);
      router.push(`/liar/${roomId}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      alert("방 생성에 실패했습니다.");
    } finally {
      setCreating(false);
      setRoomName("");
    }
  }

  function handleEnterRoom(roomId: string) {
    router.push(`/liar/${roomId}`);
  }

  const handleCloseRoomDeletedToast = useCallback(() => {
    setShowRoomDeletedToast(false);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4">
      {/* 방 폭파 메시지 토스트 */}
      {showRoomDeletedToast && (
        <Toast 
          message="방장이 방을 폭파시켰습니다." 
          onClose={handleCloseRoomDeletedToast}
          duration={5000}
          variant="error"
        />
      )}

      {/* 게임 방법 모달 */}
      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🎭 라이어 게임 방 목록
            </h1>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors border border-gray-200 hover:border-purple-300"
              onClick={() => setShowHowTo(true)}
              title="게임 방법 보기"
            >
              ❓ 게임 방법
            </button>
          </div>

          {/* 방 생성 */}
          <div className="space-y-2">
            <div>
              <input
                className={`w-full rounded-xl border-2 px-4 py-3 text-base font-medium outline-none focus:ring-4 transition-all ${
                  nameError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                }`}
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="방 이름 *"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRoom();
                }}
              />
              {nameError && (
                <div className="mt-2 p-2 rounded-lg bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                  <span className="text-xl">⚠️</span>
                  <div className="text-sm font-semibold text-red-700">{nameError}</div>
                </div>
              )}
            </div>
            <button
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateRoom}
              disabled={creating}
            >
              {creating ? "생성 중..." : "➕ 새 방 만들기"}
            </button>
          </div>
        </header>

        {/* 방 목록 */}
        <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-lg font-bold text-gray-800 mb-4">활성 방 목록</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2 animate-spin">⏳</div>
              <div className="text-sm">방 목록을 불러오는 중...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏠</div>
              <div className="text-sm">활성 방이 없습니다</div>
              <div className="text-xs mt-2">새 방을 만들어 시작하세요!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={String(room.id)}
                  onClick={() => handleEnterRoom(room.id)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 truncate">
                          {room.name || `방 ${String(room.id).slice(0, 8)}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {phaseLabel(room.phase)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        👥 {room.playerCount}명
                      </div>
                    </div>
                    <div className="text-purple-500 text-xl">→</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 플로팅 메뉴 버튼 */}
      <MenuButton
        items={[
          {
            id: "attendance",
            name: "출석부",
            emoji: "📋",
            path: "/",
          },
          {
            id: "watermelon",
            name: "수박게임",
            emoji: "🍉",
            path: "/watermelon",
          },
        ]}
        buttonEmoji="🎮"
        buttonGradient="from-purple-500 to-pink-500"
      />
    </main>
  );
}

export default function LiarRoomsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4">
        <div className="mx-auto max-w-2xl flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-spin">⏳</div>
            <div className="text-sm text-gray-500">로딩 중...</div>
          </div>
        </div>
      </main>
    }>
      <LiarRoomsPageContent />
    </Suspense>
  );
}
