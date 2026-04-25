import "@ant-design/v5-patch-for-react-19";
import type { Metadata } from "next";
import {
  Baloo_2,
  Geist,
  Geist_Mono,
  Press_Start_2P,
} from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
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

export const metadata: Metadata = {
  title: "South Park Messenger",
  description: "Chat with your favorite South Park characters.",
};

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
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#e86ea4",
                colorBgBase: "#f9e9d3",
                colorBgContainer: "#f9e9d3",
                colorTextBase: "#3f2831",
                colorBorder: "#4d2e3a",
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "var(--font-pixel), monospace",
              },
              components: {
                Layout: {
                  bodyBg: "transparent",
                  headerBg: "transparent",
                  siderBg: "transparent",
                  footerBg: "transparent",
                },
                Button: {
                  defaultBg: "#f9e9d3",
                  defaultBorderColor: "#4d2e3a",
                  defaultColor: "#3f2831",
                  primaryColor: "#3f2831",
                  primaryShadow: "none",
                },
                Input: {
                  activeBorderColor: "#4d2e3a",
                  hoverBorderColor: "#4d2e3a",
                },
                Card: {
                  headerBg: "#6ebfbe",
                },
                Modal: {
                  headerBg: "#6ebfbe",
                  contentBg: "#f9e9d3",
                  titleColor: "#2f1d24",
                },
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
