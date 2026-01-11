import { MembersBoard } from "@/features/attendance/components/MembersBoard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "출석부",
  description: "구세군 마포 영문 청년부 출석 현황을 확인하고 관리하세요. 생일 정보와 출석 통계를 한눈에 볼 수 있습니다.",
  openGraph: {
    title: "구세군 마포 영문 청년부 출석부",
    description: "구세군 마포 영문 청년부 출석 현황을 확인하고 관리하세요.",
    url: "https://mapo939.vercel.app",
  },
};

export default function Page() {
  return (
    <main className="min-h-dvh p-4 md:p-8">
      <MembersBoard />
    </main>
  );
}
