// 라운드 정보 컴포넌트

type RoundInfoProps = {
  min: number;
  max: number;
  question: string | null;
  joined: boolean;
};

export function RoundInfo({ min, max, question, joined }: RoundInfoProps) {
  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
        <span>📋</span>
        <span>라운드 정보</span>
      </div>

      {joined ? (
        question ? (
          <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">❓</span>
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">질문</div>
            </div>
            <div className="text-base font-bold text-gray-900 leading-relaxed bg-white/60 p-3 rounded-lg border border-emerald-200">
              {question}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="text-sm font-semibold text-amber-800">질문 비공개</div>
              <div className="text-xs text-amber-600 mt-0.5">답변 공개 후 확인 가능합니다</div>
            </div>
          </div>
        )
      ) : (
        <div className="p-4 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center gap-3">
          <span className="text-2xl">👁️</span>
          <div className="text-sm text-gray-700">
            참가자만 질문을 확인할 수 있어요
          </div>
        </div>
      )}

      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <div className="text-xs text-gray-600 mb-2 font-medium">답변 범위</div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-white border-2 border-indigo-300 shadow-sm">
            <span className="text-2xl font-bold text-indigo-600">{min}</span>
          </div>
          <span className="text-xl text-gray-400 font-bold">~</span>
          <div className="px-4 py-2 rounded-lg bg-white border-2 border-indigo-300 shadow-sm">
            <span className="text-2xl font-bold text-indigo-600">{max}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
