import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "@/src/features/rehabmind/styles/complete-demo.css";
import "@/src/features/rehabmind/styles/rm-visual-theme.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-rehabmind-complete.png`;

  return {
    title: "RehabMind｜运动康复思路工作台",
    description: "从自由症状描述，到动态评估、处理复测、功能训练和多次康复记录。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "RehabMind｜运动康复思路工作台",
      description: "让教练始终知道现在做什么、观察什么，以及结果如何改变下一步。",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "RehabMind 运动康复思路工作台" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "RehabMind｜运动康复思路工作台",
      description: "从症状信息、评估检查到处理复测和后续康复。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
