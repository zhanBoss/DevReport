import { memo } from "react";
import { Layout } from "antd";
import Sidebar from "./Sidebar";
import { useAppStore } from "@/store/useAppStore";
import HomePage from "@/pages/home/HomePage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ReportPage from "@/pages/report/ReportPage";
import SettingsPage from "@/pages/settings/SettingsPage";

const { Content } = Layout;

const PAGE_MAP: Record<string, React.ComponentType> = {
  home: HomePage,
  projects: ProjectsPage,
  report: ReportPage,
  settings: SettingsPage,
};

const MainLayout = () => {
  const currentPage = useAppStore((state) => state.currentPage);
  const PageComponent = PAGE_MAP[currentPage] || HomePage;

  return (
    <Layout style={{ height: "100vh" }}>
      <Sidebar />
      <Content style={{ overflow: "auto", background: "#f5f5f5" }}>
        <PageComponent key={currentPage} />
      </Content>
    </Layout>
  );
};

export default memo(MainLayout);
