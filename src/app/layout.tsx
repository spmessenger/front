"use client";
import "@ant-design/v5-patch-for-react-19";
import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import ThemedConfigProvider from "./styles";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "South Park Messenger",
//   description: "Chat with your favorite South Park characters.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} ${pressStart2P.variable}`}
      >
        <AntdRegistry>
          <ThemedConfigProvider>{children}</ThemedConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
