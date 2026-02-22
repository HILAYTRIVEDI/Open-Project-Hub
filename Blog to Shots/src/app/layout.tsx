import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blog to Shots — AI Video Generator",
  description:
    "Transform any blog post into scroll-stopping short-form vertical videos using Gemini AI and Remotion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
