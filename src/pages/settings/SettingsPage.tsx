import { memo, useState, useEffect } from 'react';
import { Card, InputNumber, Switch, Button, Typography, Space, Descriptions, Input, App } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '@/store/useAppStore';
import type { GlobalConfig } from '@/types';

const { Title, Text } = Typography;

const SettingsPage = () => {
  const { message } = App.useApp();
  const config = useAppStore(state => state.config);
  const saveConfig = useAppStore(state => state.saveConfig);
  const [localConfig, setLocalConfig] = useState<GlobalConfig | null>(null);
  const [configPath, setConfigPath] = useState('');
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(false);

  useEffect(() => { if (config) setLocalConfig({ ...config }); }, [config]);

  useEffect(() => {
    const loadPaths = async () => {
      try {
        setConfigPath(await invoke<string>('get_config_path'));
      } catch {}
    };
    loadPaths();
  }, []);

  useEffect(() => {
    const loadAutoStart = async () => {
      try {
        const enabled = await invoke<boolean>('get_autostart_enabled');
        setAutoStartEnabled(enabled);
      } catch (error) {
        console.error('获取自启动状态失败:', error);
      }
    };
    loadAutoStart();
  }, []);

  const handleSave = async () => {
    if (!localConfig) return;
    await saveConfig(localConfig);
    message.success('设置已保存');
  };

  const handleAutoStartChange = async (checked: boolean) => {
    setAutoStartLoading(true);
    try {
      await invoke('set_autostart_enabled', { enable: checked });
      setAutoStartEnabled(checked);
      message.success(checked ? '已启用开机自启动' : '已禁用开机自启动');
    } catch (error) {
      console.error('设置自启动失败:', error);
      message.error(`设置自启动失败: ${error}`);
    } finally {
      setAutoStartLoading(false);
    }
  };

  if (!localConfig) return null;

  return (
    <div style={{ padding: 24 }} className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>设置</Title>
          <Text type="secondary">全局配置和偏好设置</Text>
        </div>
        <Space>
          <Button icon={<UndoOutlined />} onClick={() => config && setLocalConfig({ ...config })}>撤销修改</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
        </Space>
      </div>

      <div style={{ maxWidth: 640 }}>
        <Card title="LLM 配置" style={{ marginBottom: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>API Key</Text>
              <Input.Password
                value={localConfig.llm.api_key}
                onChange={e => setLocalConfig({
                  ...localConfig,
                  llm: { ...localConfig.llm, api_key: e.target.value },
                })}
                placeholder="sk-..."
              />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>API 地址</Text>
              <Input
                value={localConfig.llm.base_url}
                onChange={e => setLocalConfig({
                  ...localConfig,
                  llm: { ...localConfig.llm, base_url: e.target.value },
                })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>模型</Text>
              <Input
                value={localConfig.llm.model}
                onChange={e => setLocalConfig({
                  ...localConfig,
                  llm: { ...localConfig.llm, model: e.target.value },
                })}
                placeholder="gpt-3.5-turbo"
              />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>超时时间（秒）</Text>
                <InputNumber
                  value={localConfig.llm.timeout}
                  onChange={v => setLocalConfig({
                    ...localConfig,
                    llm: { ...localConfig.llm, timeout: v || 30 },
                  })}
                  min={10} max={300} style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Temperature</Text>
                <InputNumber
                  value={localConfig.llm.temperature}
                  onChange={v => setLocalConfig({
                    ...localConfig,
                    llm: { ...localConfig.llm, temperature: v || 0.7 },
                  })}
                  min={0} max={2} step={0.1} style={{ width: '100%' }}
                />
              </div>
            </div>
          </Space>
        </Card>

        <Card 
          title="报告默认字数" 
          extra={
            <Button 
              size="small" 
              onClick={() => setLocalConfig({
                ...localConfig,
                reports: { daily: 100, weekly: 300, monthly: 500, quarterly: 800, yearly: 1000 },
              })}>
              恢复推荐值
            </Button>
          }
          style={{ marginBottom: 12 }}>
          <Space wrap size={16}>
            {([
              { key: 'daily' as const, label: '日报', default: 100 },
              { key: 'weekly' as const, label: '周报', default: 300 },
              { key: 'monthly' as const, label: '月报', default: 500 },
              { key: 'quarterly' as const, label: '季报', default: 800 },
              { key: 'yearly' as const, label: '年报', default: 1000 },
            ]).map(item => (
              <div key={item.key}>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                <br />
                <InputNumber
                  value={localConfig.reports?.[item.key] ?? item.default}
                  onChange={v => setLocalConfig({
                    ...localConfig,
                    reports: { ...localConfig.reports, [item.key]: v || item.default },
                  })}
                  min={50} max={3000} addonAfter="字" style={{ width: 140 }}
                />
              </div>
            ))}
          </Space>
        </Card>

        <Card title="本地存储路径" style={{ marginBottom: 12 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="配置文件">
              <Text code style={{ fontSize: 12, wordBreak: 'break-all' }}>{configPath || '加载中...'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="系统设置" style={{ marginBottom: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>开机自启动</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>开机时自动启动应用</Text>
              </div>
              <Switch 
                checked={autoStartEnabled}
                loading={autoStartLoading}
                onChange={handleAutoStartChange}
              />
            </div>
          </Space>
        </Card>

        <Card title="关于 DevReport">
          <Text>基于 Git 记录的自动化工作报告生成工具</Text>
          <br /><Text type="secondary" style={{ fontSize: 12 }}>版本 1.0.0 · Tauri + React + Ant Design</Text>
        </Card>
      </div>
    </div>
  );
};

export default memo(SettingsPage);
