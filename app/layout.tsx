import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SonnerProvider } from "@/components/providers/sonner-provider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr"
});

export const metadata: Metadata = {
  title: "Yours | 퍼스널 소프트웨어 추천 + 개발자 매칭",
  description: "기존 소프트웨어 추천부터 맞춤 개발 역경매 매칭까지 한 번에 연결하는 프로토타입"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${manrope.variable} ${notoSansKr.variable} antialiased`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(188_70%_96%),_hsl(0_0%_100%))]">
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
        </div>
        <SonnerProvider />
      </body>
    </html>
  );
}
