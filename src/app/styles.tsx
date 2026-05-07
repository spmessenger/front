import { useMessengerTheme } from "@/hooks/features/messenger/chats";
import { ConfigProvider } from "antd";

function EmptyConfigProvider({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

function MonoConfigProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "black",
          fontFamily: "var(--font-geist-mono), monospace !important",
        },
        components: {
          Card: {
            headerBg: "#101113 !important",
          },
          Modal: {
            colorText: "white !important",
          }
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function RetroConfigProvider({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

export default function ThemedConfigProvider({ children }: { children: React.ReactNode }) {
  const theme = useMessengerTheme();
  let CP = EmptyConfigProvider;
  switch (theme) {
    case "mono":
      CP = MonoConfigProvider;
      break;
    case "retro":
      CP = RetroConfigProvider;
      break;
    default:
      console.log(
        "Unknown theme:",
        theme,
        "There is no theme provider for this theme.",
      );
  }
  return <CP>{children}</CP>;
}
