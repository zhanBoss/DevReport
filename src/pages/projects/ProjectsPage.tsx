import { memo, useState } from 'react';
import { Button, Card, List, Space, Typography, Popconfirm, Tag, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ProjectOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import type { ProjectConfig } from '@/types';
import ProjectForm from './ProjectForm';

const { Title, Text } = Typography;

const ProjectsPage = () => {
  const config = useAppStore(state => state.config);
  const deleteProject = useAppStore(state => state.deleteProject);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);

  const projects = config?.projects || [];

  const handleEdit = (project: ProjectConfig) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (showForm) {
    return <ProjectForm project={editingProject} onClose={handleFormClose} />;
  }

  return (
    <div style={{ padding: 24 }} className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>项目管理</Title>
          <Text type="secondary">管理你的 Git 项目和 LLM 配置</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
          添加项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
              添加项目
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          dataSource={projects}
          renderItem={project => (
            <Card style={{ marginBottom: 12 }} hoverable>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space align="start" size={12}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ProjectOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>{project.name}</Text>
                    <div><Text type="secondary" code style={{ fontSize: 12 }}>{project.repo_path}</Text></div>
                    <Space style={{ marginTop: 8 }} size={[0, 4]} wrap>
                      <Tag>提交人: {project.authors.length > 0 ? project.authors.length + '人' : '全部'}</Tag>
                      {project.submodules.length > 0 && (
                        <Tag color="cyan">子模块: {project.submodules.filter(s => s.enabled).length}/{project.submodules.length}</Tag>
                      )}
                    </Space>
                  </div>
                </Space>
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => handleEdit(project)}>编辑</Button>
                  <Popconfirm title="确定删除该项目？" onConfirm={() => deleteProject(project.id)} okText="删除" cancelText="取消">
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          )}
        />
      )}
    </div>
  );
};

export default memo(ProjectsPage);
