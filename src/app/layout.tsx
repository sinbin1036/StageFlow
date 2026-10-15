import type { Metadata, Viewport } from "next";
import { Anton, Black_Han_Sans, Gothic_A1 } from "next/font/google";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
// 한글 폰트는 글자 범위가 넓어 미리 불러오지 않고, 필요한 글자 조각만 받는다
const blackHanSans = Black_Han_Sans({ variable: "--font-black-han-sans", weight: "400", preload: false });
const gothicA1 = Gothic_A1({ variable: "--font-gothic-a1", weight: ["400", "600", "800"], preload: false });

export const metadata: Metadata = {
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
