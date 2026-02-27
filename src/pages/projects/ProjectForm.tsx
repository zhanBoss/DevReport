import { memo, useState, useEffect } from 'react';
import { Button, Input, Form, Checkbox, Space, Typography, Card, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, FolderOpenOutlined, CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '@/store/useAppStore';
import type { ProjectConfig, SubmoduleConfig } from '@/types';

const { Title, Text } = Typography;

interface ProjectFormProps {
  project: ProjectConfig | null;
  onClose: () => void;
}

const ProjectForm = (props: ProjectFormProps) => {
  const { project, onClose } = props;
  const addProject = useAppStore(state => state.addProject);
  const updateProject = useAppStore(state => state.updateProject);

  const [name, setName] = useState(project?.name || '');
  const [nameManuallySet, setNameManuallySet] = useState(!!project?.name);
  const [repoPath, setRepoPath] = useState(project?.repo_path || '');
  const [authors, setAuthors] = useState<string[]>(project?.authors || []);
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
  const [submodules, setSubmodules] = useState<SubmoduleConfig[]>(project?.submodules || []);
  const [validating, setValidating] = useState(false);
  const [repoValid, setRepoValid] = useState<boolean | null>(null);
  const [authorSearch, setAuthorSearch] = useState('');

  useEffect(() => {
    if (repoPath) validateAndLoadRepo();
  }, [repoPath]);

  const validateAndLoadRepo = async () => {
    setValidating(true);
    try {
      const valid = await invoke<boolean>('validate_repo_path', { path: repoPath });
      setRepoValid(valid);
      if (valid) {
        if (!nameManuallySet) {
          const folderName = await invoke<string>('get_folder_name', { path: repoPath });
          setName(folderName);
        }
        const gitAuthors = await invoke<string[]>('get_git_authors', { path: repoPath });
        setAvailableAuthors(gitAuthors);
        const gitSubmodules = await invoke<{ name: string; path: string }[]>('get_git_submodules', { path: repoPath });
        if (!project) setSubmodules(gitSubmodules.map(s => ({ ...s, enabled: true })));
      }
    } catch { setRepoValid(false); }
    setValidating(false);
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) setRepoPath(selected as string);
    } catch (e) { console.error('选择文件夹失败:', e); }
  };

  const handleSave = async () => {
    if (!repoPath.trim()) return;
    const finalName = name.trim() || repoPath.split('/').pop() || 'Untitled';
    const data: ProjectConfig = {
      id: project?.id || crypto.randomUUID(),
      name: finalName, repo_path: repoPath.trim(),
      authors, submodules,
    };
    if (project) await updateProject(data);
    else await addProject(data);
    onClose();
  };

  const filteredAuthors = availableAuthors.filter(a => a.toLowerCase().includes(authorSearch.toLowerCase()));

  return (
    <div style={{ padding: 24 }} className="animate-fadeIn">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onClose} />
        <div>
          <Title level={4} style={{ margin: 0 }}>{project ? '编辑项目' : '添加项目'}</Title>
          <Text type="secondary">配置 Git 仓库路径和提交人筛选</Text>
        </div>
      </Space>

      <div style={{ maxWidth: 640 }}>
        <Card>
          <Form layout="vertical">
            <Form.Item label="仓库路径" required
              validateStatus={repoValid === false ? 'error' : repoValid === true ? 'success' : undefined}
              help={repoValid === false ? '路径无效或不是 Git 仓库' : undefined}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={repoPath} onChange={e => setRepoPath(e.target.value)}
                  placeholder="/Users/xxx/projects/my-project" style={{ fontFamily: 'monospace' }}
                  suffix={validating ? <LoadingOutlined /> : repoValid ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : null}
                />
                <Button icon={<FolderOpenOutlined />} onClick={handleSelectFolder}>选择</Button>
              </Space.Compact>
            </Form.Item>

            <Form.Item label="项目名称（可选，默认用文件夹名）">
              <Input
                value={name}
                onChange={e => { setName(e.target.value); setNameManuallySet(true); }}
                placeholder={repoPath ? repoPath.split('/').pop() : '自动使用文件夹名'}
              />
            </Form.Item>
          </Form>
        </Card>

        {submodules.length > 0 && (
          <Card title="子模块" style={{ marginTop: 12 }}>
            {submodules.map(sub => (
              <div key={sub.path} style={{ padding: '8px 0' }}>
                <Checkbox checked={sub.enabled}
                  onChange={e => setSubmodules(prev => prev.map(s => s.path === sub.path ? { ...s, enabled: e.target.checked } : s))}>
                  <Text strong>{sub.name}</Text>
                  <br /><Text type="secondary" code style={{ fontSize: 11 }}>{sub.path}</Text>
                </Checkbox>
              </div>
            ))}
          </Card>
        )}

        {availableAuthors.length > 0 && (
          <Card title="提交人筛选（不选则包含全部）" style={{ marginTop: 12 }}>
            <Input placeholder="搜索提交人..." value={authorSearch} onChange={e => setAuthorSearch(e.target.value)}
              style={{ marginBottom: 8 }} allowClear />
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              <Checkbox.Group value={authors} onChange={v => setAuthors(v as string[])}>
                <Space direction="vertical">
                  {filteredAuthors.map(a => <Checkbox key={a} value={a}>{a}</Checkbox>)}
                </Space>
              </Checkbox.Group>
            </div>
          </Card>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave} disabled={!repoPath.trim()}>
            {project ? '保存修改' : '添加项目'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(ProjectForm);
