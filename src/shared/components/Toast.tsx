// Toast 컴포넌트

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-xs text-gray-700">
      {message}
      <button className="ml-2 underline text-gray-600" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}
