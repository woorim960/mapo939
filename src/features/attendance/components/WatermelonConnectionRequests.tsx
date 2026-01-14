// 수박게임 연결 요청 관리 컴포넌트 (관리자용)

"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/Modal";
import { ApiError } from "@/shared/utils/error";

type ConnectionRequest = {
  id: string;
  playerId: string;
  memberId: string;
  status: string;
  createdAt: string;
  player: {
    id: string;
    nickname: string;
    gamePoints: number;
    createdAt: string;
  };
  member: {
    id: string;
    name: string;
    phone: string;
    photoUrl: string;
  };
};

type WatermelonConnectionRequestsProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function WatermelonConnectionRequests({
  open,
  onClose,
  onSuccess,
}: WatermelonConnectionRequestsProps) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [rejectConfirm, setRejectConfirm] = useState<ConnectionRequest | null>(null);
  const [approveWarning, setApproveWarning] = useState<{
    requestId: string;
    warningType: "member_already_connected" | "player_already_connected";
    existingPlayer: { id: string; nickname: string; memberName: string | null };
    newPlayer: { id: string; nickname: string; existingMemberName?: string | null };
    member: { id: string; name: string };
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [open]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/watermelon/connection-requests");
      if (!response.ok) {
        throw new Error("요청 목록을 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error: any) {
      console.error("Failed to load requests:", error);
      setToast(error.message || "요청 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, force: boolean = false) => {
    if (processing) return;

    try {
      setProcessing(requestId);
      const response = await fetch(`/api/watermelon/connection-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = "승인에 실패했습니다.";
        
        if (error.error === "player_already_connected") {
          errorMessage = "이미 다른 멤버와 연결된 플레이어입니다.";
        } else if (error.error === "member_already_connected") {
          errorMessage = "이미 다른 플레이어와 연결된 멤버입니다.";
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 경고 정보가 있으면 확인 모달 표시
      if ((data.warning === "member_already_connected" || data.warning === "player_already_connected") && !force) {
        setApproveWarning({
          requestId,
          warningType: data.warning,
          existingPlayer: data.existingPlayer,
          newPlayer: data.newPlayer,
          member: data.member,
        });
        setProcessing(null);
        return;
      }

      setToast(`멤버 "${data.memberName}"와의 연결이 승인되었습니다.`);
      setApproveWarning(null);
      await loadRequests();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Failed to approve request:", error);
      setToast(error.message || "승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveWarning) return;
    await handleApprove(approveWarning.requestId, true);
  };

  const handleApproveCancel = () => {
    setApproveWarning(null);
  };

  const handleRejectClick = (request: ConnectionRequest) => {
    setRejectConfirm(request);
  };

  const handleRejectConfirm = async () => {
    if (!rejectConfirm || processing) return;

    try {
      setProcessing(rejectConfirm.id);
      const response = await fetch(`/api/watermelon/connection-requests/${rejectConfirm.id}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("거부에 실패했습니다.");
      }

      setToast("연결 요청이 거부되었습니다.");
      setRejectConfirm(null);
      await loadRequests();
    } catch (error: any) {
      console.error("Failed to reject request:", error);
      setToast(error.message || "거부에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectCancel = () => {
    setRejectConfirm(null);
  };

  if (!open) return null;

  return (
    <>
      <Modal onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <span>🔗</span>
              <span>수박게임 연결 요청</span>
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

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl animate-spin mb-2">⏳</div>
              <div className="text-sm">요청 목록 불러오는 중...</div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm">대기 중인 연결 요청이 없습니다.</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30 p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* 멤버 정보 */}
                    <div className="flex-shrink-0">
                      {request.member.photoUrl ? (
                        <img
                          src={request.member.photoUrl}
                          alt={request.member.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
                          👤
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-gray-800 text-sm">
                            {request.member.name}
                          </div>
                          <div className="text-xs text-gray-600">{request.member.phone}</div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                        <div className="text-xs text-blue-800 font-semibold mb-1">
                          수박게임 계정
                        </div>
                        <div className="text-sm text-blue-900 font-bold">
                          {request.player.nickname}
                        </div>
                        <div className="text-xs text-blue-700">
                          게임 포인트: {request.player.gamePoints.toLocaleString()}P
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(request.id, false)}
                          disabled={processing === request.id}
                          className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                          {processing === request.id ? "처리 중..." : "✅ 승인"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectClick(request)}
                          disabled={processing === request.id}
                          className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                          {processing === request.id ? "처리 중..." : "❌ 거부"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 승인 경고 모달 (이미 연결된 멤버/플레이어가 있는 경우) */}
      {approveWarning && (
        <div
          className="fixed z-[200] flex items-center justify-center p-4"
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
          {/* Backdrop */}
          <div
            className="absolute bg-black/70 backdrop-blur-sm transition-opacity duration-200 opacity-100"
            onClick={handleApproveCancel}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          
          {/* Modal Content */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-yellow-200/50 p-6 transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{
              position: 'relative',
              zIndex: 201,
              margin: 'auto',
              maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">⚠️</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {approveWarning.warningType === "member_already_connected" 
                        ? "이미 연결된 멤버" 
                        : "이미 연결된 플레이어"}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {approveWarning.warningType === "member_already_connected"
                        ? "이 멤버는 이미 다른 플레이어와 연결되어 있습니다."
                        : "이 플레이어는 이미 다른 멤버와 연결되어 있습니다."}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApproveCancel}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div className="flex-1">
                    <div className="font-bold text-yellow-800 mb-1">
                      {approveWarning.warningType === "member_already_connected"
                        ? "현재 연결된 플레이어"
                        : "현재 연결된 멤버"}
                    </div>
                    <div className="text-sm text-yellow-700">
                      {approveWarning.warningType === "member_already_connected" ? (
                        <>
                          <div className="font-semibold">{approveWarning.existingPlayer.nickname}</div>
                          {approveWarning.existingPlayer.memberName && (
                            <div className="text-xs mt-1">멤버: {approveWarning.existingPlayer.memberName}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-semibold">{approveWarning.existingPlayer.nickname}</div>
                          {approveWarning.existingPlayer.memberName && (
                            <div className="text-xs mt-1">멤버: {approveWarning.existingPlayer.memberName}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">🔄</span>
                  <div className="flex-1">
                    <div className="font-bold text-blue-800 mb-1">
                      {approveWarning.warningType === "member_already_connected"
                        ? "새로 연결할 플레이어"
                        : "새로 연결할 멤버"}
                    </div>
                    <div className="text-sm text-blue-700">
                      <div className="font-semibold">{approveWarning.newPlayer.nickname}</div>
                      <div className="text-xs mt-1">멤버: {approveWarning.member.name}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="font-bold text-red-800 mb-1">주의사항</div>
                    <div className="text-sm text-red-700">
                      {approveWarning.warningType === "member_already_connected"
                        ? "승인하면 기존 연결이 해제되고 새로운 플레이어로 교체됩니다."
                        : "승인하면 기존 연결이 해제되고 새로운 멤버로 교체됩니다."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleApproveCancel}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApproveConfirm}
                  disabled={processing === approveWarning.requestId}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {processing === approveWarning.requestId ? "처리 중..." : "그래도 승인"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거부 확인 모달 */}
      {rejectConfirm && (
        <div
          className="fixed z-[200] flex items-center justify-center p-4"
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
          {/* Backdrop */}
          <div
            className="absolute bg-black/70 backdrop-blur-sm transition-opacity duration-200 opacity-100"
            onClick={handleRejectCancel}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          
          {/* Modal Content */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-red-200/50 p-6 transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{
              position: 'relative',
              zIndex: 201,
              margin: 'auto',
              maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">⚠️</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">연결 요청 거부 확인</h3>
                    <div className="text-sm text-gray-600">정말 이 연결 요청을 거부하시겠습니까?</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRejectCancel}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div className="flex-1">
                    <div className="font-bold text-red-800 mb-1">주의사항</div>
                    <div className="text-sm text-red-700">
                      거부된 요청은 되돌릴 수 없으며, 사용자는 다시 요청을 생성할 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {rejectConfirm.member.photoUrl ? (
                    <img
                      src={rejectConfirm.member.photoUrl}
                      alt={rejectConfirm.member.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-blue-800">{rejectConfirm.member.name}</div>
                    <div className="text-sm text-blue-600">{rejectConfirm.member.phone}</div>
                  </div>
                </div>
                <div className="bg-white border border-blue-200 rounded-lg p-2">
                  <div className="text-xs text-blue-800 font-semibold mb-1">수박게임 계정</div>
                  <div className="text-sm text-blue-900 font-bold">{rejectConfirm.player.nickname}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRejectCancel}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={processing === rejectConfirm.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {processing === rejectConfirm.id ? "처리 중..." : "거부하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
