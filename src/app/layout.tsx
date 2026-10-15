import type { Metadata, Viewport } from "next";
import { Anton, Black_Han_Sans, Gothic_A1 } from "next/font/google";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
// 한글 폰트는 글자 범위가 넓어 미리 불러오지 않고, 필요한 글자 조각만 받는다
const blackHanSans = Black_Han_Sans({ variable: "--font-black-han-sans", weight: "400", preload: false });
const gothicA1 = Gothic_A1({ variable: "--font-gothic-a1", weight: ["400", "600", "800"], preload: false });

// 카톡 미리보기 이미지처럼 절대 주소가 필요한 메타데이터의 기준 주소.
// 배포 도메인을 바꾸면 NEXT_PUBLIC_SITE_URL만 바꾼다 (없으면 Vercel 기본 도메인 → 로컬 순서).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "StageFlow", template: "%s · StageFlow" },
  description: "버스킹 참가곡 신청과 공연 순서를 한 곳에서",
};

export const viewport: Viewport = {
  themeColor: "#d8d8d4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${anton.variable} ${blackHanSans.variable} ${gothicA1.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
