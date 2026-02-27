import { memo, useState } from "react";
import { Button, Steps, Typography } from "antd";
import {
  RocketOutlined,
  ProjectOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";

const { Title, Paragraph } = Typography;

const STEPS = [
  {
    icon: <RocketOutlined />,
    title: "欢迎使用 DevReport",
    desc: "基于 Git 记录的自动化工作报告生成工具。让我们快速配置，开始使用。",
  },
  {
    icon: <ProjectOutlined />,
    title: "添加 Git 项目",
    desc: "在「项目管理」页面添加本地 Git 仓库，支持子模块识别和提交人筛选。项目名默认为文件夹名。",
  },
  {
    icon: <SettingOutlined />,
    title: "配置 LLM",
    desc: "在项目设置中配置 LLM API 参数（API Key、模型名称等），用于生成工作报告。",
  },
  {
    icon: <CheckCircleOutlined />,
    title: "准备就绪",
    desc: "一切就绪！您可以开始生成日报、周报、月报等工作报告了。支持多项目合并总结。",
  },
];

const WelcomeGuide = () => {
  const markFirstLaunchDone = useAppStore((state) => state.markFirstLaunchDone);
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f5ff, #e6f4ff)",
      }}
    >
      <div
        style={{ width: 480, textAlign: "center", padding: 32 }}
        className="animate-fadeIn"
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "linear-gradient(135deg, #4096ff, #1677ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 32,
            color: "#fff",
          }}
        >
          {STEPS[step].icon}
        </div>
        <Title level={3}>{STEPS[step].title}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 32 }}>
          {STEPS[step].desc}
        </Paragraph>
        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 32 }}
          items={STEPS.map((s, i) => ({ title: "", key: i }))}
        />
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Button onClick={markFirstLaunchDone}>跳过</Button>
          <Button
            type="primary"
            size="large"
            onClick={() =>
              isLast ? markFirstLaunchDone() : setStep((s) => s + 1)
            }
          >
            {isLast ? "开始使用" : "下一步"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(WelcomeGuide);
