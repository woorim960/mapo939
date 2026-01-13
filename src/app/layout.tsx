import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorSuppressor } from "./ErrorSuppressor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "구세군 마포 영문 청년부 | 출석 관리 & 게임",
    template: "%s | 구세군 마포 영문 청년부",
  },
  description: "구세군 마포 영문 청년/학생들을 위한 출석 관리와 재미있는 게임을 즐길 수 있는 앱입니다. 출석 체크부터 라이어 게임까지, 함께 모여 즐거운 시간을 보내세요!",
  keywords: ["구세군", "마포 영문", "청년부", "출석 관리", "라이어 게임", "게임", "출석부"],
  authors: [{ name: "구세군 마포 영문 청년부" }],
  creator: "구세군 마포 영문 청년부",
  publisher: "구세군 마포 영문 청년부",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://mapo939.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://mapo939.vercel.app",
    siteName: "구세군 마포 영문 청년부",
    title: "구세군 마포 영문 청년부 | 출석 관리 & 게임",
    description: "구세군 마포 영문 청년/학생들을 위한 출석 관리와 재미있는 게임을 즐길 수 있는 앱입니다. 출석 체크부터 라이어 게임까지, 함께 모여 즐거운 시간을 보내세요!",
    images: [
      {
        url: "https://mapo939.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "구세군 마포 영문 청년부 - 출석 관리와 게임 앱",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "구세군 마포 영문 청년부 | 출석 관리 & 게임",
    description: "구세군 마포 영문 청년/학생들을 위한 출석 관리와 재미있는 게임을 즐길 수 있는 앱입니다.",
    images: ["https://mapo939.vercel.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // 필요시 추가
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light" data-theme="light">
      <body
        className={`min-h-screen bg-white text-gray-900 ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
