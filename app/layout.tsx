import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-rehabmind.png`;

  return {
    title: "RehabMind｜教练康复思路助手",
    description: "覆盖主要关节常见损伤，从症状询问、评估检查到处理、训练和多次复查。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "RehabMind｜从症状到康复思路",
      description: "评估、处理、训练和复查组成的运动康复思路助手。",
      type: "website",
      images: [{ url: socialImage, width: 1728, height: 909, alt: "RehabMind 从症状到康复思路" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "RehabMind｜从症状到康复思路",
      description: "评估、处理、训练和复查组成的运动康复思路助手。",
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
