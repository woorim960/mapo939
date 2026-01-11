// 방 제목 수정 컴포넌트

import { useState } from "react";

type RoomNameEditorProps = {
  currentName: string | null;
  isHost: boolean;
  busy: boolean;
  onUpdate: (name: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
};

export function RoomNameEditor({
  currentName,
  isHost,
  busy,
  onUpdate,
  onLeaveRoom,
}: RoomNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [error, setError] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // 방장이 아닌 경우에도 방 제목과 나가기 버튼 표시
  if (!isHost) {
    return (
      <div className="flex items-center gap-2 group">
        <div className="text-sm font-medium text-gray-700 flex-1">
          {currentName || "이름 없음"}
        </div>
        <button
          className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onLeaveRoom}
          disabled={busy}
          title="방 나가기"
        >
          🚪
        </button>
      </div>
    );
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("방 이름을 입력해주세요.");
      return;
    }

    setError("");
    setUpdating(true);
    try {
      await onUpdate(trimmedName);
      setIsEditing(false);
    } catch (err) {
      setError("방 이름 수정에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  }

  function handleCancel() {
    setName(currentName ?? "");
    setError("");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-medium outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-purple-300 focus:border-purple-500 focus:ring-purple-200"
          }`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          placeholder="방 이름"
          disabled={updating || busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
        />
        {error && (
          <div className="text-xs text-red-600 font-medium">{error}</div>
        )}
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={updating || busy}
          >
            {updating ? "저장 중..." : "저장"}
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCancel}
            disabled={updating || busy}
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm font-medium text-gray-700 flex-1">
        {currentName || "이름 없음"}
      </div>
      <div className="flex items-center gap-1">
        <button
          className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setIsEditing(true)}
          disabled={busy}
          title="방 이름 수정"
        >
          ✏️
        </button>
        <button
          className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onLeaveRoom}
          disabled={busy}
          title="방 나가기"
        >
          🚪
        </button>
      </div>
    </div>
  );
}
