import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "antd/dist/reset.css"; // Reset CSS mặc định của Antd

// 1. Import bản vá lỗi cho React 19 (QUAN TRỌNG)
import "@ant-design/v5-patch-for-react-19";

// 2. Import Registry đã tạo ở Bước 1
import AntdRegistry from "@/lib/AntdRegistry";

import HeaderBar from "@/layouts/header";
import FooterBar from "@/layouts/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "HỆ THỐNG NHẬN DIỆN PHÂN LOẠI LỖI CỦA SỨ THỦY TINH CÁCH ĐIỆN TRÊN ĐƯỜNG DÂY 110 KV",
  description:
    "Hệ thống nhận diện phân loại lỗi của sứ thủy tinh cách điện trên đường dây 110 kV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#e6f0ff" }}
      >
        {/* Bọc nội dung bằng AntdRegistry để CSS hoạt động đúng khi load trang */}
        <AntdRegistry>
          <HeaderBar />
          {/* Thêm minHeight để Footer không bị đẩy lên giữa màn hình nếu nội dung ngắn */}
          <div style={{ minHeight: "calc(100vh - 150px)" }}>{children}</div>
          <FooterBar />
        </AntdRegistry>
      </body>
    </html>
  );
}
