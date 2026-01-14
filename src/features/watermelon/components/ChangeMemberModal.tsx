// 멤버 변경 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { fetchMembers } from "@/features/attendance/api/members";
import type { Member } from "@/shared/types";

type ChangeMemberModalProps = {
  open: boolean;
  onClose: () => void;
  currentMemberName?: string | null;
  currentMemberId?: string;
  playerId: string;
  playerNickname: string;
  onSuccess: () => void;
  onToast: (message: string) => void;
};

export function ChangeMemberModal({
  open,
  onClose,
  currentMemberName,
  currentMemberId,
  playerId,
  playerNickname,
  onSuccess,
  onToast,
}: ChangeMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");

  // 멤버 목록 로드
  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const allMembers = await fetchMembers();
      setMembers(allMembers);
    } catch (error) {
      console.error("Failed to load members:", error);
      onToast("멤버 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredMembers = members.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return member.name.toLowerCase().includes(query);
  });

  const handleMemberSelect = (member: Member) => {
    // 현재 연결된 멤버와 동일하면 선택 불가
    if (member.id === currentMemberId) {
      onToast("이미 연결된 멤버입니다.");
      return;
    }
    setSelectedMember(member);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedMember || !password.trim()) {
      onToast("비밀번호를 입력해주세요.");
      return;
    }

    setChanging(true);
    try {
      const response = await fetch("/api/watermelon/player/change-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          newMemberId: selectedMember.id,
          nickname: playerNickname,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = "멤버 변경에 실패했습니다.";
        
        if (error.error === "invalid_password") {
          errorMessage = "비밀번호가 올바르지 않습니다.";
        } else if (error.error === "member_already_connected") {
          errorMessage = "이미 다른 계정과 연결된 멤버입니다.";
        } else if (error.error === "member_not_found") {
          errorMessage = "멤버를 찾을 수 없습니다.";
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onToast(`멤버가 ${data.memberName || selectedMember.name}로 변경되었습니다.`);
      setShowConfirm(false);
      setSelectedMember(null);
      setPassword("");
      setSearchQuery("");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Change member failed:", error);
      onToast(error.message || "멤버 변경에 실패했습니다.");
    } finally {
      setChanging(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedMember(null);
    setPassword("");
  };

  if (!open) return null;

  return (
    <>
      {/* 멤버 검색 모달 */}
      {!showConfirm && (
        <div
          className="fixed z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
          onClick={onClose}
        >
          {/* 모달 */}
          <div
            className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="멤버 변경"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: '100%',
              height: '100%',
            }}
          >
            {/* 헤더 - 고정 */}
            <div className="flex-shrink-0 p-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <span>멤버 변경</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {currentMemberName && (
                <div className="text-xs text-gray-600 mb-2">
                  현재 연결된 멤버: <span className="font-semibold">{currentMemberName}</span>
                </div>
              )}

              {/* 검색 입력 */}
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  placeholder="멤버 이름으로 검색..."
                  className="w-full rounded-xl border-2 border-gray-300 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>

            {/* 멤버 목록 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-3 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl animate-spin mb-2">⏳</div>
                  <div className="text-sm">멤버 목록 불러오는 중...</div>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "검색 결과가 없습니다." : "멤버가 없습니다."}
                </div>
              ) : (
                  <div className="space-y-2">
                    {filteredMembers.map((member) => {
                      const isCurrent = member.id === currentMemberId;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberSelect(member);
                          }}
                          disabled={isCurrent}
                          className={`w-full rounded-xl border-2 p-3 flex items-center gap-3 transition-all duration-200 ${
                            isCurrent
                              ? "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                              : "border-blue-300 bg-gradient-to-br from-white to-blue-50/30 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          }`}
                        >
                        <div className="flex-shrink-0">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-sm text-gray-800">{member.name}</div>
                          <div className="text-xs text-gray-600">{member.phone}</div>
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-blue-600 font-semibold">현재 연결됨</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 확정 모달 */}
      {showConfirm && selectedMember && (
        <div
          className="fixed z-[81] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          {/* 모달 */}
          <div
            className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="멤버 변경 확인"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: '100%',
              height: '100%',
            }}
          >
            {/* 헤더 - 고정 */}
            <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">멤버 변경 확인</h3>
                  <div className="text-sm text-gray-600">연결된 멤버를 변경하시겠습니까?</div>
                </div>
              </div>
            </div>

            {/* 내용 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="font-bold text-yellow-800 mb-1">주의사항</div>
                    <div className="text-sm text-yellow-700">
                      멤버를 변경하면 기존 연결이 해제되고 새로운 멤버로 연결됩니다.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  {selectedMember.photoUrl ? (
                    <img
                      src={selectedMember.photoUrl}
                      alt={selectedMember.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-blue-800">{selectedMember.name}</div>
                    <div className="text-sm text-blue-600">{selectedMember.phone}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="수박게임 비밀번호를 입력하세요"
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* 하단 버튼 - 고정 */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={changing || !password.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {changing ? "변경 중..." : "변경하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
