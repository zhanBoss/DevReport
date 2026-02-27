import { memo } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space } from 'antd';
import {
  ProjectOutlined, RocketOutlined,
  PlusOutlined, SettingOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';

const { Title, Text } = Typography;

const HomePage = () => {
  const config = useAppStore(state => state.config);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);
  const gitInstalled = useAppStore(state => state.gitInstalled);
  const gitVersion = useAppStore(state => state.gitVersion);

  const projectCount = config?.projects.length || 0;

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }} className="animate-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>欢迎使用 DevReport</Title>
        <Text type="secondary">基于 Git 记录的自动化工作报告生成工具</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic 
              title="已添加项目"
              value={projectCount} 
              prefix={<ProjectOutlined />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" style={{ height: '100%' }}>
            <Space size={12}>
              <CheckCircleFilled style={{ 
                color: gitInstalled ? '#52c41a' : '#d9d9d9', 
                fontSize: 24 
              }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
                  {gitInstalled ? 'Git 已安装' : 'Git 未安装'}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {gitVersion || '请先安装 Git'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginBottom: 0 }}>快捷操作</Title>
      </div>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {[
          { 
            label: '生成报告', 
            icon: <RocketOutlined />, 
            page: 'report',
          },
          { 
            label: '添加项目', 
            icon: <PlusOutlined />, 
            page: 'projects',
          },
          { 
            label: '设置', 
            icon: <SettingOutlined />, 
            page: 'settings',
          },
        ].map(a => (
          <Col xs={8} key={a.page}>
            <Card 
              size="small"
              hoverable 
              onClick={() => setCurrentPage(a.page)}
              style={{ cursor: 'pointer', textAlign: 'center' }}
              bodyStyle={{ padding: '16px 12px' }}
            >
              <div style={{ fontSize: 20, color: '#1677ff', marginBottom: 8 }}>
                {a.icon}
              </div>
              <Text style={{ fontSize: 13 }}>{a.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {projectCount === 0 && (
        <Card 
          size="small"
          style={{ 
            textAlign: 'center', 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          bodyStyle={{ width: '100%' }}
        >
          <div>
            <ProjectOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Title level={5} style={{ marginBottom: 8 }}>开始使用</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              添加你的第一个 Git 项目，开始生成工作报告
            </Text>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCurrentPage('projects')}
            >
              添加项目
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default memo(HomePage);
