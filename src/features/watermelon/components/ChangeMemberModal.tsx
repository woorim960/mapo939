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
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingMemberIds, setPendingMemberIds] = useState<Set<string>>(new Set());
  const [rejectedMemberIds, setRejectedMemberIds] = useState<Set<string>>(new Set());
  const [pendingRequestInfo, setPendingRequestInfo] = useState<{ memberId: string; memberName: string } | null>(null);
  const [connectedPlayers, setConnectedPlayers] = useState<Record<string, string>>({});

  // 멤버 목록 로드
  useEffect(() => {
    if (open) {
      loadMembers();
      loadPendingRequests();
    }
  }, [open, playerId]);

  // 멤버 목록이 로드되면 연결된 플레이어 정보도 조회
  useEffect(() => {
    if (open && members.length > 0) {
      loadConnectedPlayers();
    }
  }, [open, members]);

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

  const loadPendingRequests = async () => {
    try {
      const response = await fetch(`/api/watermelon/player/pending-requests?playerId=${encodeURIComponent(playerId)}`);
      if (response.ok) {
        const data = await response.json() as { 
          requests: Array<{ member: { id: string; name: string } }>;
          rejectedRequests: Array<{ member: { id: string; name: string } }>;
        };
        const pendingMemberIds = new Set<string>(data.requests.map((req) => req.member.id));
        const rejectedMemberIds = new Set<string>(data.rejectedRequests.map((req) => req.member.id));
        setPendingMemberIds(pendingMemberIds);
        setRejectedMemberIds(rejectedMemberIds);
        // 첫 번째 대기 중인 요청 정보 저장 (1개만 허용)
        if (data.requests.length > 0) {
          setPendingRequestInfo({
            memberId: data.requests[0].member.id,
            memberName: data.requests[0].member.name,
          });
        } else {
          setPendingRequestInfo(null);
        }
      }
    } catch (error) {
      console.error("Failed to load pending requests:", error);
      // 에러는 무시 (선택적 기능)
    }
  };

  const loadConnectedPlayers = async () => {
    try {
      const memberIds = members.map((m) => m.id).join(",");
      if (!memberIds) return;

      const response = await fetch(`/api/watermelon/members/connected-players?memberIds=${encodeURIComponent(memberIds)}`);
      if (response.ok) {
        const data = await response.json() as { connectedPlayers: Record<string, string> };
        setConnectedPlayers(data.connectedPlayers || {});
      }
    } catch (error) {
      console.error("Failed to load connected players:", error);
      // 에러는 무시 (선택적 기능)
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

    // 승인 대기 중인 멤버를 클릭한 경우
    if (pendingRequestInfo && pendingRequestInfo.memberId === member.id) {
      onToast(`"${member.name}" 멤버에 대한 연결 요청이 이미 관리자 승인을 기다리는 중입니다.`);
      return;
    }

    // 기존 대기 중인 요청이 있고, 선택한 멤버가 다른 경우 변경 확인 모달 표시
    if (pendingRequestInfo && pendingRequestInfo.memberId !== member.id) {
      setSelectedMember(member);
      setShowChangeConfirm(true);
      return;
    }

    setSelectedMember(member);
    setShowConfirm(true);
  };

  const handleCancelExistingRequest = async () => {
    if (!password.trim()) {
      onToast("비밀번호를 입력해주세요.");
      return;
    }

    setChanging(true);
    try {
      const response = await fetch("/api/watermelon/player/cancel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = "기존 요청 취소에 실패했습니다.";
        
        if (error.error === "invalid_password") {
          errorMessage = "비밀번호가 올바르지 않습니다.";
        } else if (error.error === "no_pending_request") {
          errorMessage = "대기 중인 요청이 없습니다.";
        }
        
        onToast(errorMessage);
        setChanging(false);
        return;
      }

      // 기존 요청 취소 성공, 새 요청 생성
      await createNewRequest();
    } catch (error: any) {
      console.error("Cancel request failed:", error);
      onToast(error.message || "기존 요청 취소에 실패했습니다.");
      setChanging(false);
    }
  };

  const createNewRequest = async () => {
    if (!selectedMember || !password.trim()) {
      onToast("비밀번호를 입력해주세요.");
      setChanging(false);
      return;
    }

    const isNewConnection = !currentMemberId;
    const endpoint = isNewConnection 
      ? "/api/watermelon/player/connect"
      : "/api/watermelon/player/change-member";
    
    const requestBody = isNewConnection
      ? {
          memberId: selectedMember.id,
          nickname: playerNickname,
          password,
        }
      : {
          playerId,
          newMemberId: selectedMember.id,
          nickname: playerNickname,
          password,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = isNewConnection 
          ? "멤버 연결에 실패했습니다."
          : "멤버 변경에 실패했습니다.";
        
        if (error.error === "invalid_password") {
          errorMessage = "비밀번호가 올바르지 않습니다.";
        } else if (error.error === "player_already_connected") {
          errorMessage = "이미 다른 멤버와 연결된 계정입니다.";
        } else if (error.error === "request_already_pending" || error.error === "request_already_exists") {
          errorMessage = isNewConnection 
            ? "이미 관리자 승인을 기다리는 연결 요청이 있습니다."
            : "이미 관리자 승인을 기다리는 변경 요청이 있습니다.";
        } else if (error.error === "member_not_found") {
          errorMessage = "멤버를 찾을 수 없습니다.";
        } else if (error.error === "player_not_found") {
          errorMessage = "수박게임 계정을 찾을 수 없습니다.";
        } else if (error.error === "password_not_set") {
          errorMessage = "수박게임 계정에 비밀번호가 설정되지 않았습니다.";
        } else if (error.error === "same_member") {
          errorMessage = "현재 연결된 멤버와 동일합니다.";
        }
        
        onToast(errorMessage);
        setChanging(false);
        return;
      }

      const data = await response.json();
      let successMessage = isNewConnection
        ? `"${selectedMember.name}" 멤버와의 연결 요청이 생성되었습니다. 관리자 승인을 기다리는 중입니다.`
        : `"${selectedMember.name}" 멤버로의 변경 요청이 생성되었습니다. 관리자 승인을 기다리는 중입니다.`;
      
      // 이미 연결된 닉네임이 있는 경우 메시지 추가
      if (data.existingConnection?.nickname) {
        successMessage = isNewConnection
          ? `"${selectedMember.name}" 멤버와의 연결 요청이 생성되었습니다. (현재 "${data.existingConnection.nickname}" 닉네임과 연결되어 있음) 관리자 승인을 기다리는 중입니다.`
          : `"${selectedMember.name}" 멤버로의 변경 요청이 생성되었습니다. (현재 "${data.existingConnection.nickname}" 닉네임과 연결되어 있음) 관리자 승인을 기다리는 중입니다.`;
      }
      
      onToast(data.message || successMessage);
      setShowConfirm(false);
      setShowChangeConfirm(false);
      setSelectedMember(null);
      setPassword("");
      setSearchQuery("");
      // 대기 중인 요청 목록 새로고침
      await loadPendingRequests();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(isNewConnection ? "Connect member failed:" : "Change member failed:", error);
      onToast(error.message || (isNewConnection ? "멤버 연결에 실패했습니다." : "멤버 변경에 실패했습니다."));
    } finally {
      setChanging(false);
    }
  };

  const handleConfirm = async () => {
    await createNewRequest();
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setShowChangeConfirm(false);
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

              {currentMemberName ? (
                <div className="text-xs text-gray-600 mb-2">
                  현재 연결된 멤버: <span className="font-semibold">{currentMemberName}</span>
                </div>
              ) : (
                <div className="text-xs text-blue-600 mb-2">
                  출석 포인트를 사용하려면 멤버를 연결해주세요.
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
                      const isPending = pendingMemberIds.has(member.id);
                      const isRejected = rejectedMemberIds.has(member.id);
                      const connectedNickname = connectedPlayers[member.id];
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isCurrent) {
                              handleMemberSelect(member);
                            }
                          }}
                          disabled={isCurrent}
                          className={`w-full rounded-xl border-2 p-3 flex items-center gap-3 transition-all duration-200 ${
                            isCurrent
                              ? "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                              : isPending
                              ? "border-amber-300 bg-amber-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                              : isRejected
                              ? "border-red-300 bg-red-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
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
                            {connectedNickname && (
                              <div className="text-xs text-purple-600 font-semibold mt-0.5">
                                현재 연결된 닉네임: {connectedNickname}
                              </div>
                            )}
                          </div>
                          {isCurrent && (
                            <div className="text-xs text-blue-600 font-semibold">현재 연결됨</div>
                          )}
                          {isPending && !isCurrent && (
                            <div className="text-xs text-amber-600 font-semibold">승인 대기중</div>
                          )}
                          {isRejected && !isCurrent && !isPending && (
                            <div className="text-xs text-red-600 font-semibold">승인 거부됨</div>
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

      {/* 변경 확인 모달 (기존 요청이 있는 경우) */}
      {showChangeConfirm && selectedMember && pendingRequestInfo && (
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
            aria-label="요청 변경 확인"
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
                  <h3 className="text-xl font-bold text-gray-800 mb-1">요청 변경 확인</h3>
                  <div className="text-sm text-gray-600">기존 대기 중인 요청을 취소하고 새 요청을 생성하시겠습니까?</div>
                </div>
              </div>
            </div>

            {/* 내용 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div className="flex-1">
                    <div className="font-bold text-yellow-800 mb-1">현재 대기 중인 요청</div>
                    <div className="text-sm text-yellow-700">
                      "{pendingRequestInfo.memberName}" 멤버에 대한 연결 요청이 대기 중입니다.
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
                    <div className="font-bold text-blue-800">새로 요청할 멤버</div>
                    <div className="text-sm text-blue-600">{selectedMember.name}</div>
                  </div>
                </div>
              </div>

              {connectedPlayers[selectedMember.id] && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-yellow-800 mb-1">이미 연결된 닉네임</div>
                      <div className="text-sm text-yellow-700">
                        이 멤버는 이미 <span className="font-semibold">"{connectedPlayers[selectedMember.id]}"</span> 닉네임과 연결되어 있습니다.
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        승인 시 기존 연결이 해제되고 새로운 연결로 교체됩니다.
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  onClick={handleCancelExistingRequest}
                  disabled={changing || !password.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {changing ? "처리 중..." : "변경하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 확정 모달 */}
      {showConfirm && selectedMember && !showChangeConfirm && (
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
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {currentMemberId ? "멤버 변경 확인" : "멤버 연결 확인"}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {currentMemberId 
                      ? "연결된 멤버를 변경하시겠습니까?"
                      : "이 멤버와 연결하시겠습니까? (관리자 승인 필요)"}
                  </div>
                </div>
              </div>
            </div>

            {/* 내용 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {currentMemberId ? (
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
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">ℹ️</span>
                    <div className="flex-1">
                      <div className="font-bold text-blue-800 mb-1">안내</div>
                      <div className="text-sm text-blue-700">
                        멤버 연결 요청이 생성되면 관리자 승인 후 연결이 완료됩니다.
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {connectedPlayers[selectedMember.id] && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-yellow-800 mb-1">이미 연결된 닉네임</div>
                      <div className="text-sm text-yellow-700">
                        이 멤버는 이미 <span className="font-semibold">"{connectedPlayers[selectedMember.id]}"</span> 닉네임과 연결되어 있습니다.
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        {currentMemberId 
                          ? "승인 시 기존 연결이 해제되고 새로운 연결로 교체됩니다."
                          : "승인 시 기존 연결이 해제되고 새로운 연결로 교체됩니다."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  {changing 
                    ? (currentMemberId ? "변경 중..." : "연결 중...")
                    : (currentMemberId ? "변경하기" : "연결하기")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
