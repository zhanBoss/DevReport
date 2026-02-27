import { useEffect, memo } from "react";
import { ConfigProvider, App as AntApp, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useAppStore } from "@/store/useAppStore";
import MainLayout from "@/components/layout/MainLayout";
import WelcomeGuide from "@/components/common/WelcomeGuide";

const AppContent = () => {
  const config = useAppStore((state) => state.config);
  const loading = useAppStore((state) => state.loading);
  const loadConfig = useAppStore((state) => state.loadConfig);
  const checkGitInstalled = useAppStore((state) => state.checkGitInstalled);

  useEffect(() => {
    loadConfig();
    checkGitInstalled();
  }, [loadConfig, checkGitInstalled]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #4096ff, #1677ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: 20 }}>
              D
            </span>
          </div>
          <p style={{ color: "#8c8c8c", fontSize: 14 }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (config?.first_launch) {
    return <WelcomeGuide />;
  }

  return <MainLayout />;
};

const App = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  );
};

export default memo(App);
