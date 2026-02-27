import { memo } from "react";
import { Layout, Menu } from "antd";
import {
  HomeOutlined,
  ProjectOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";

const { Sider } = Layout;

const MENU_ITEMS = [
  { key: "home", icon: <HomeOutlined />, label: "首页" },
  { key: "projects", icon: <ProjectOutlined />, label: "项目管理" },
  { key: "report", icon: <FileTextOutlined />, label: "生成报告" },
  { key: "settings", icon: <SettingOutlined />, label: "设置" },
];

const Sidebar = () => {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  return (
    <Sider width={200} style={{ background: "#fff", height: "100vh" }}>
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #4096ff, #1677ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
            D
          </span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1f1f1f" }}>
            DevReport
          </div>
          <div style={{ fontSize: 11, color: "#8c8c8c" }}>Git 工作报告</div>
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentPage]}
        items={MENU_ITEMS}
        onClick={({ key }) => setCurrentPage(key)}
        style={{ borderRight: 0, marginTop: 8 }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          fontSize: 11,
          color: "#bfbfbf",
        }}
      >
        v1.0.0
      </div>
    </Sider>
  );
};

export default memo(Sidebar);
